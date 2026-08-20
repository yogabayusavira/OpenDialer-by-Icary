//! High-Level Native SIP Client & Active Session Manager

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use parking_lot::Mutex;
use tokio::net::UdpSocket;
use tokio::sync::mpsc;
use tauri::{AppHandle, Emitter};

use crate::sip::audio::AudioEngine;
use crate::sip::auth::DigestChallenge;
use crate::sip::codecs::{decode_pcma_to_pcm, decode_pcmu_to_pcm, encode_pcm_to_pcma, encode_pcm_to_pcmu};
use crate::sip::message::{SipMessage, SipMethod};
use crate::sip::rtp::{dtmf_char_to_event, RtpPacket};
use crate::sip::sdp::SdpSession;
use crate::sip::transport::{create_udp_transport, spawn_udp_receiver};
use crate::sip::types::{CallStatePayload, CallStatus, RegistrationStatus, RegistrationStatusPayload, SipAccountConfig};

struct ActiveCallSession {
    call_id: String,
    to_tag: Option<String>,
    from_tag: String,
    cseq: u32,
    destination: String,
    remote_rtp_addr: Option<SocketAddr>,
    selected_codec: u8, // 0 = PCMU, 8 = PCMA
    dtmf_pt: u8,
    rtp_socket: Option<Arc<UdpSocket>>,
    stop_rtp: Arc<AtomicBool>,
}

pub struct SipClient {
    app_handle: AppHandle,
    config: Mutex<Option<SipAccountConfig>>,
    registration_status: Mutex<RegistrationStatus>,
    call_status: Mutex<CallStatus>,
    active_call: Mutex<Option<ActiveCallSession>>,
    audio_engine: AudioEngine,
    udp_socket: Mutex<Option<Arc<UdpSocket>>>,
    local_ip: Mutex<String>,
    local_port: Mutex<u16>,
    cseq_counter: AtomicU32,
    session_id_counter: AtomicU64,
    stop_reg_loop: Arc<AtomicBool>,
}

impl SipClient {
    pub fn new(app_handle: AppHandle) -> Arc<Self> {
        let audio_engine = AudioEngine::new();
        audio_engine.spawn_audio_thread();

        Arc::new(Self {
            app_handle,
            config: Mutex::new(None),
            registration_status: Mutex::new(RegistrationStatus::Disconnected),
            call_status: Mutex::new(CallStatus::Idle),
            active_call: Mutex::new(None),
            audio_engine,
            udp_socket: Mutex::new(None),
            local_ip: Mutex::new("127.0.0.1".to_string()),
            local_port: Mutex::new(5060),
            cseq_counter: AtomicU32::new(1),
            session_id_counter: AtomicU64::new(rand::random()),
            stop_reg_loop: Arc::new(AtomicBool::new(false)),
        })
    }

    fn emit_registration_status(&self, status: RegistrationStatus, message: Option<String>) {
        *self.registration_status.lock() = status;
        let _ = self.app_handle.emit(
            "sip://registration-status",
            RegistrationStatusPayload { status, message },
        );
    }

    fn emit_call_status(&self, state: CallStatus, destination: Option<String>, error_message: Option<String>) {
        *self.call_status.lock() = state;
        let _ = self.app_handle.emit(
            "sip://call-state",
            CallStatePayload {
                state,
                destination,
                caller_id: None,
                error_message,
            },
        );
    }

    pub async fn register(self: &Arc<Self>, account: SipAccountConfig) -> Result<(), String> {
        self.unregister().await?;
        *self.config.lock() = Some(account.clone());
        self.emit_registration_status(RegistrationStatus::Connecting, Some("Connecting to SIP PBX...".to_string()));

        let remote_port = account.port.unwrap_or(5060);
        let remote_host = if account.server.trim().is_empty() {
            &account.domain
        } else {
            &account.server
        };

        let (socket, _remote_addr, local_ip, local_port) =
            create_udp_transport(remote_host, remote_port).await?;

        *self.udp_socket.lock() = Some(socket.clone());
        *self.local_ip.lock() = local_ip.clone();
        *self.local_port.lock() = local_port;

        let (incoming_tx, mut incoming_rx) = mpsc::unbounded_channel::<SipMessage>();
        spawn_udp_receiver(socket.clone(), incoming_tx);

        let call_id = format!("{:x}@{}", rand::random::<u64>(), local_ip);
        let from_tag = format!("{:x}", rand::random::<u32>());
        let branch = format!("z9hG4bK{:x}", rand::random::<u64>());

        // 1. Send initial unauthenticated REGISTER
        let cseq = self.cseq_counter.fetch_add(1, Ordering::SeqCst);
        let reg_req = self.build_register_request(&account, &call_id, &from_tag, &branch, cseq, None);
        let _ = socket.send(reg_req.as_bytes()).await;

        // 2. Wait for 401/407 challenge or 200 OK
        let mut challenge_auth: Option<DigestChallenge> = None;
        let mut is_registered = false;

        let timeout = tokio::time::sleep(Duration::from_secs(6));
        tokio::pin!(timeout);

        loop {
            tokio::select! {
                _ = &mut timeout => {
                    self.emit_registration_status(RegistrationStatus::Error, Some("Registration timed out. Check server/port/firewall.".to_string()));
                    return Err("Registration timed out.".to_string());
                }
                Some(msg) = incoming_rx.recv() => {
                    match msg {
                        SipMessage::Response { status_code, headers, .. } => {
                            if status_code == 401 || status_code == 407 {
                                let header_key = if status_code == 401 { "www-authenticate" } else { "proxy-authenticate" };
                                if let Some(auth_hdr) = headers.get(header_key) {
                                    challenge_auth = DigestChallenge::parse(auth_hdr);
                                    break;
                                }
                            } else if status_code == 200 {
                                is_registered = true;
                                break;
                            } else if status_code >= 400 {
                                let err = format!("PBX rejected registration with status {}", status_code);
                                self.emit_registration_status(RegistrationStatus::Error, Some(err.clone()));
                                return Err(err);
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        // 3. If challenged with 401/407, compute response and send authenticated REGISTER
        if let Some(challenge) = challenge_auth {
            let auth_user = account.auth_username.as_ref().unwrap_or(&account.username);
            let uri = format!("sip:{}", account.domain);
            let auth_header_str = challenge.format_auth_header(
                auth_user,
                &account.password,
                "REGISTER",
                &uri,
                "Authorization",
            );

            let branch2 = format!("z9hG4bK{:x}", rand::random::<u64>());
            let cseq2 = self.cseq_counter.fetch_add(1, Ordering::SeqCst);
            let auth_req = self.build_register_request(&account, &call_id, &from_tag, &branch2, cseq2, Some(&auth_header_str));
            let _ = socket.send(auth_req.as_bytes()).await;

            let timeout2 = tokio::time::sleep(Duration::from_secs(6));
            tokio::pin!(timeout2);

            loop {
                tokio::select! {
                    _ = &mut timeout2 => {
                        self.emit_registration_status(RegistrationStatus::Error, Some("Authentication timed out.".to_string()));
                        return Err("Authentication timed out.".to_string());
                    }
                    Some(msg) = incoming_rx.recv() => {
                        match msg {
                            SipMessage::Response { status_code, .. } => {
                                if status_code == 200 {
                                    is_registered = true;
                                    break;
                                } else if status_code >= 400 {
                                    let err = format!("Authentication failed (SIP {})", status_code);
                                    self.emit_registration_status(RegistrationStatus::Error, Some(err.clone()));
                                    return Err(err);
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }

        if is_registered {
            self.emit_registration_status(RegistrationStatus::Registered, None);
            self.start_message_and_refresh_loop(socket, incoming_rx, account);
            Ok(())
        } else {
            self.emit_registration_status(RegistrationStatus::Error, Some("Failed to complete registration.".to_string()));
            Err("Registration failed.".to_string())
        }
    }

    fn build_register_request(
        &self,
        account: &SipAccountConfig,
        call_id: &str,
        from_tag: &str,
        branch: &str,
        cseq: u32,
        auth_header: Option<&str>,
    ) -> String {
        let local_ip = self.local_ip.lock().clone();
        let local_port = *self.local_port.lock();
        let mut headers = HashMap::new();

        headers.insert(
            "Via".to_string(),
            format!("SIP/2.0/UDP {}:{};branch={};rport", local_ip, local_port, branch),
        );
        headers.insert("Max-Forwards".to_string(), "70".to_string());
        headers.insert(
            "From".to_string(),
            format!("<sip:{}@{}>;tag={}", account.username, account.domain, from_tag),
        );
        headers.insert(
            "To".to_string(),
            format!("<sip:{}@{}>", account.username, account.domain),
        );
        headers.insert("Call-ID".to_string(), call_id.to_string());
        headers.insert("CSeq".to_string(), format!("{} REGISTER", cseq));
        headers.insert(
            "Contact".to_string(),
            format!("<sip:{}@{}:{}>;expires=120", account.username, local_ip, local_port),
        );
        headers.insert("Expires".to_string(), "120".to_string());
        headers.insert("User-Agent".to_string(), "Icary OpenDialer/1.0 (Desktop; Native)".to_string());
        headers.insert("Allow".to_string(), "INVITE, ACK, CANCEL, BYE, OPTIONS, INFO".to_string());

        if let Some(auth) = auth_header {
            if let Some((k, v)) = auth.split_once(':') {
                headers.insert(k.trim().to_string(), v.trim().to_string());
            }
        }

        let msg = SipMessage::Request {
            method: SipMethod::Register,
            uri: format!("sip:{}", account.domain),
            headers,
            body: "".to_string(),
        };

        msg.serialize()
    }

    fn start_message_and_refresh_loop(
        self: &Arc<Self>,
        socket: Arc<UdpSocket>,
        mut incoming_rx: mpsc::UnboundedReceiver<SipMessage>,
        account: SipAccountConfig,
    ) {
        let this = self.clone();
        let stop_flag = self.stop_reg_loop.clone();
        stop_flag.store(false, Ordering::SeqCst);

        tokio::spawn(async move {
            let mut refresh_interval = tokio::time::interval(Duration::from_secs(50));
            refresh_interval.tick().await;

            loop {
                if stop_flag.load(Ordering::SeqCst) {
                    break;
                }

                tokio::select! {
                    _ = refresh_interval.tick() => {
                        let local_ip = this.local_ip.lock().clone();
                        let call_id = format!("{:x}@{}", rand::random::<u64>(), local_ip);
                        let from_tag = format!("{:x}", rand::random::<u32>());
                        let branch = format!("z9hG4bK{:x}", rand::random::<u64>());
                        let cseq = this.cseq_counter.fetch_add(1, Ordering::SeqCst);
                        let reg_req = this.build_register_request(&account, &call_id, &from_tag, &branch, cseq, None);
                        let _ = socket.send(reg_req.as_bytes()).await;
                    }
                    Some(msg) = incoming_rx.recv() => {
                        this.handle_incoming_sip_message(msg).await;
                    }
                }
            }
        });
    }

    async fn handle_incoming_sip_message(self: &Arc<Self>, msg: SipMessage) {
        match msg {
            SipMessage::Response { status_code, body, headers, .. } => {
                let action = {
                    let mut active = self.active_call.lock();
                    if let Some(session) = active.as_mut() {
                        if status_code == 100 {
                            Some(("dialing", session.destination.clone(), None))
                        } else if status_code == 180 || status_code == 183 {
                            Some(("ringing", session.destination.clone(), None))
                        } else if status_code == 200 {
                            if let Some(to_hdr) = headers.get("to").or_else(|| headers.get("t")) {
                                if let Some((_, tag_part)) = to_hdr.split_once("tag=") {
                                    session.to_tag = Some(tag_part.split(';').next().unwrap_or("").to_string());
                                }
                            }

                            if let Some(sdp) = SdpSession::parse(&body) {
                                if let Ok(remote_addr) = format!("{}:{}", sdp.connection_ip, sdp.audio_port).parse::<SocketAddr>() {
                                    session.remote_rtp_addr = Some(remote_addr);
                                    session.selected_codec = if sdp.codecs.contains(&8) && !sdp.codecs.contains(&0) { 8 } else { 0 };
                                    if let Some(dtmf_pt) = sdp.dtmf_payload_type {
                                        session.dtmf_pt = dtmf_pt;
                                    }
                                }
                            }
                            Some(("connected", session.destination.clone(), None))
                        } else if status_code >= 400 {
                            let err = format!("Call failed with status {}", status_code);
                            session.stop_rtp.store(true, Ordering::SeqCst);
                            *active = None;
                            Some(("ended", String::new(), Some(err)))
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                };

                if let Some((event_type, dest, err)) = action {
                    match event_type {
                        "dialing" => self.emit_call_status(CallStatus::Dialing, Some(dest), None),
                        "ringing" => self.emit_call_status(CallStatus::Ringing, Some(dest), None),
                        "connected" => {
                            self.send_ack().await;
                            self.start_rtp_stream().await;
                            self.emit_call_status(CallStatus::Connected, None, None);
                        }
                        "ended" => self.emit_call_status(CallStatus::Ended, None, err),
                        _ => {}
                    }
                }
            }
            SipMessage::Request { method, headers, .. } => {
                if method == SipMethod::Bye {
                    let mut active = self.active_call.lock();
                    if let Some(session) = active.take() {
                        session.stop_rtp.store(true, Ordering::SeqCst);
                    }
                    self.emit_call_status(CallStatus::Ended, None, None);
                } else if method == SipMethod::Options {
                    self.send_options_ok(&headers).await;
                }
            }
        }
    }

    async fn send_ack(&self) {
        let (socket, config, active) = {
            let sock = self.udp_socket.lock().clone();
            let cfg = self.config.lock().clone();
            let act = self.active_call.lock();
            (sock, cfg, act.as_ref().map(|s| (s.call_id.clone(), s.from_tag.clone(), s.to_tag.clone(), s.cseq, s.destination.clone())))
        };

        if let (Some(socket), Some(config), Some((call_id, from_tag, to_tag, cseq, destination))) = (socket, config, active) {
            let local_ip = self.local_ip.lock().clone();
            let local_port = *self.local_port.lock();
            let branch = format!("z9hG4bK{:x}", rand::random::<u64>());

            let to_header = if let Some(tag) = to_tag {
                format!("<sip:{}@{}>;tag={}", destination, config.domain, tag)
            } else {
                format!("<sip:{}@{}>", destination, config.domain)
            };

            let mut headers = HashMap::new();
            headers.insert("Via".to_string(), format!("SIP/2.0/UDP {}:{};branch={};rport", local_ip, local_port, branch));
            headers.insert("Max-Forwards".to_string(), "70".to_string());
            headers.insert("From".to_string(), format!("<sip:{}@{}>;tag={}", config.username, config.domain, from_tag));
            headers.insert("To".to_string(), to_header);
            headers.insert("Call-ID".to_string(), call_id);
            headers.insert("CSeq".to_string(), format!("{} ACK", cseq));
            headers.insert("User-Agent".to_string(), "Icary OpenDialer/1.0".to_string());

            let ack = SipMessage::Request {
                method: SipMethod::Ack,
                uri: format!("sip:{}@{}", destination, config.domain),
                headers,
                body: "".to_string(),
            };

            let _ = socket.send(ack.serialize().as_bytes()).await;
        }
    }

    async fn send_options_ok(&self, req_headers: &HashMap<String, String>) {
        let socket = self.udp_socket.lock().clone();
        if let Some(socket) = socket {
            let mut headers = HashMap::new();
            if let Some(via) = req_headers.get("via").or_else(|| req_headers.get("v")) {
                headers.insert("Via".to_string(), via.clone());
            }
            if let Some(from) = req_headers.get("from").or_else(|| req_headers.get("f")) {
                headers.insert("From".to_string(), from.clone());
            }
            if let Some(to) = req_headers.get("to").or_else(|| req_headers.get("t")) {
                headers.insert("To".to_string(), to.clone());
            }
            if let Some(call_id) = req_headers.get("call-id").or_else(|| req_headers.get("i")) {
                headers.insert("Call-ID".to_string(), call_id.clone());
            }
            if let Some(cseq) = req_headers.get("cseq") {
                headers.insert("CSeq".to_string(), cseq.clone());
            }
            headers.insert("User-Agent".to_string(), "Icary OpenDialer/1.0".to_string());
            headers.insert("Allow".to_string(), "INVITE, ACK, CANCEL, BYE, OPTIONS, INFO".to_string());

            let ok = SipMessage::Response {
                status_code: 200,
                reason: "OK".to_string(),
                headers,
                body: "".to_string(),
            };
            let _ = socket.send(ok.serialize().as_bytes()).await;
        }
    }

    pub async fn call(self: &Arc<Self>, destination: String) -> Result<(), String> {
        let (socket, config) = {
            let s = self.udp_socket.lock().clone();
            let c = self.config.lock().clone();
            (s, c)
        };

        let socket = socket.ok_or_else(|| "SIP is not registered. Connect first.".to_string())?;
        let config = config.ok_or_else(|| "No SIP account configured.".to_string())?;

        let clean_dest = destination.replace(|c: char| !c.is_ascii_digit() && c != '+', "");
        if clean_dest.is_empty() {
            return Err("Invalid phone number or extension.".to_string());
        }

        // Bind local RTP socket
        let rtp_socket = Arc::new(UdpSocket::bind("0.0.0.0:0").await.map_err(|e| format!("Failed to bind RTP socket: {}", e))?);
        let rtp_port = rtp_socket.local_addr().map_err(|e| format!("Failed to get RTP port: {}", e))?.port();

        let local_ip = self.local_ip.lock().clone();
        let local_port = *self.local_port.lock();
        let call_id = format!("{:x}@{}", rand::random::<u64>(), local_ip);
        let from_tag = format!("{:x}", rand::random::<u32>());
        let branch = format!("z9hG4bK{:x}", rand::random::<u64>());
        let cseq = self.cseq_counter.fetch_add(1, Ordering::SeqCst);
        let session_id = self.session_id_counter.fetch_add(1, Ordering::SeqCst);

        let sdp_offer = SdpSession::build_offer(&local_ip, rtp_port, session_id);

        let mut headers = HashMap::new();
        headers.insert("Via".to_string(), format!("SIP/2.0/UDP {}:{};branch={};rport", local_ip, local_port, branch));
        headers.insert("Max-Forwards".to_string(), "70".to_string());
        headers.insert("From".to_string(), format!("<sip:{}@{}>;tag={}", config.username, config.domain, from_tag));
        headers.insert("To".to_string(), format!("<sip:{}@{}>", clean_dest, config.domain));
        headers.insert("Call-ID".to_string(), call_id.clone());
        headers.insert("CSeq".to_string(), format!("{} INVITE", cseq));
        headers.insert("Contact".to_string(), format!("<sip:{}@{}:{}>", config.username, local_ip, local_port));
        headers.insert("Content-Type".to_string(), "application/sdp".to_string());
        headers.insert("User-Agent".to_string(), "Icary OpenDialer/1.0".to_string());
        headers.insert("Allow".to_string(), "INVITE, ACK, CANCEL, BYE, OPTIONS, INFO".to_string());

        let invite_msg = SipMessage::Request {
            method: SipMethod::Invite,
            uri: format!("sip:{}@{}", clean_dest, config.domain),
            headers,
            body: sdp_offer,
        };

        let session = ActiveCallSession {
            call_id: call_id.clone(),
            to_tag: None,
            from_tag,
            cseq,
            destination: clean_dest.clone(),
            remote_rtp_addr: None,
            selected_codec: 0, // PCMU
            dtmf_pt: 101,
            rtp_socket: Some(rtp_socket),
            stop_rtp: Arc::new(AtomicBool::new(false)),
        };

        *self.active_call.lock() = Some(session);
        self.emit_call_status(CallStatus::Dialing, Some(clean_dest), None);

        socket.send(invite_msg.serialize().as_bytes()).await.map_err(|e| format!("Failed to send INVITE: {}", e))?;
        Ok(())
    }

    async fn start_rtp_stream(&self) {
        let (rtp_socket, remote_addr, stop_rtp, selected_codec) = {
            let active = self.active_call.lock();
            if let Some(session) = active.as_ref() {
                if let (Some(sock), Some(addr)) = (&session.rtp_socket, session.remote_rtp_addr) {
                    (Some(sock.clone()), Some(addr), session.stop_rtp.clone(), session.selected_codec)
                } else {
                    (None, None, Arc::new(AtomicBool::new(true)), 0)
                }
            } else {
                (None, None, Arc::new(AtomicBool::new(true)), 0)
            }
        };

        if let (Some(rtp_socket), Some(remote_addr)) = (rtp_socket, remote_addr) {
            let audio_engine_send = self.audio_engine.clone();
            let audio_engine_recv = self.audio_engine.clone();
            let rtp_sock_send = rtp_socket.clone();
            let rtp_sock_recv = rtp_socket.clone();
            let stop_send = stop_rtp.clone();
            let stop_recv = stop_rtp.clone();

            // 1. RTP Send Loop (20ms frames = 50 packets per second)
            tokio::spawn(async move {
                let mut ticker = tokio::time::interval(Duration::from_millis(20));
                let mut seq: u16 = rand::random();
                let mut ts: u32 = rand::random();
                let ssrc: u32 = rand::random();

                while !stop_send.load(Ordering::SeqCst) {
                    ticker.tick().await;
                    if let Some(pcm_frame) = audio_engine_send.pop_mic_frame() {
                        let payload = if selected_codec == 8 {
                            encode_pcm_to_pcma(&pcm_frame)
                        } else {
                            encode_pcm_to_pcmu(&pcm_frame)
                        };

                        let packet = RtpPacket::new(selected_codec, seq, ts, ssrc, false, payload);
                        let _ = rtp_sock_send.send_to(&packet.serialize(), remote_addr).await;

                        seq = seq.wrapping_add(1);
                        ts = ts.wrapping_add(160); // 160 samples per 20ms at 8000Hz
                    }
                }
            });

            // 2. RTP Receive Loop
            tokio::spawn(async move {
                let mut buf = vec![0u8; 2048];
                while !stop_recv.load(Ordering::SeqCst) {
                    match rtp_sock_recv.recv_from(&mut buf).await {
                        Ok((len, _)) => {
                            if let Some(packet) = RtpPacket::parse(&buf[..len]) {
                                if packet.payload_type == 0 {
                                    let pcm = decode_pcmu_to_pcm(&packet.payload);
                                    audio_engine_recv.push_speaker_pcm(&pcm);
                                } else if packet.payload_type == 8 {
                                    let pcm = decode_pcma_to_pcm(&packet.payload);
                                    audio_engine_recv.push_speaker_pcm(&pcm);
                                }
                            }
                        }
                        Err(_) => {
                            break;
                        }
                    }
                }
            });
        }
    }

    pub async fn hangup(&self) -> Result<(), String> {
        let (socket, config, session) = {
            let s = self.udp_socket.lock().clone();
            let c = self.config.lock().clone();
            let mut a = self.active_call.lock();
            (s, c, a.take())
        };

        if let (Some(socket), Some(config), Some(session)) = (socket, config, session) {
            session.stop_rtp.store(true, Ordering::SeqCst);

            let local_ip = self.local_ip.lock().clone();
            let local_port = *self.local_port.lock();
            let branch = format!("z9hG4bK{:x}", rand::random::<u64>());
            let cseq = self.cseq_counter.fetch_add(1, Ordering::SeqCst);

            let to_header = if let Some(tag) = session.to_tag {
                format!("<sip:{}@{}>;tag={}", session.destination, config.domain, tag)
            } else {
                format!("<sip:{}@{}>", session.destination, config.domain)
            };

            let mut headers = HashMap::new();
            headers.insert("Via".to_string(), format!("SIP/2.0/UDP {}:{};branch={};rport", local_ip, local_port, branch));
            headers.insert("Max-Forwards".to_string(), "70".to_string());
            headers.insert("From".to_string(), format!("<sip:{}@{}>;tag={}", config.username, config.domain, session.from_tag));
            headers.insert("To".to_string(), to_header);
            headers.insert("Call-ID".to_string(), session.call_id);
            headers.insert("CSeq".to_string(), format!("{} BYE", cseq));
            headers.insert("User-Agent".to_string(), "Icary OpenDialer/1.0".to_string());

            let bye = SipMessage::Request {
                method: SipMethod::Bye,
                uri: format!("sip:{}@{}", session.destination, config.domain),
                headers,
                body: "".to_string(),
            };

            let _ = socket.send(bye.serialize().as_bytes()).await;
        }

        self.emit_call_status(CallStatus::Ended, None, None);
        Ok(())
    }

    pub fn set_muted(&self, muted: bool) {
        self.audio_engine.set_muted(muted);
    }

    pub async fn send_dtmf(&self, digits: String) -> Result<(), String> {
        let (rtp_socket, remote_addr, dtmf_pt) = {
            let active = self.active_call.lock();
            if let Some(session) = active.as_ref() {
                (session.rtp_socket.clone(), session.remote_rtp_addr, session.dtmf_pt)
            } else {
                (None, None, 101)
            }
        };

        if let (Some(rtp_socket), Some(remote_addr)) = (rtp_socket, remote_addr) {
            for ch in digits.chars() {
                if let Some(event_code) = dtmf_char_to_event(ch) {
                    let mut seq: u16 = rand::random();
                    let ts: u32 = rand::random();
                    let ssrc: u32 = rand::random();

                    // Send 3 in-progress packets and 3 end-of-event packets per RFC 4733
                    for _ in 0..3 {
                        let payload = RtpPacket::create_dtmf_payload(event_code, false, 10, 160);
                        let packet = RtpPacket::new(dtmf_pt, seq, ts, ssrc, false, payload);
                        let _ = rtp_socket.send_to(&packet.serialize(), remote_addr).await;
                        seq = seq.wrapping_add(1);
                        tokio::time::sleep(Duration::from_millis(20)).await;
                    }
                    for _ in 0..3 {
                        let payload = RtpPacket::create_dtmf_payload(event_code, true, 10, 320);
                        let packet = RtpPacket::new(dtmf_pt, seq, ts, ssrc, false, payload);
                        let _ = rtp_socket.send_to(&packet.serialize(), remote_addr).await;
                        seq = seq.wrapping_add(1);
                        tokio::time::sleep(Duration::from_millis(20)).await;
                    }
                }
            }
        }
        Ok(())
    }

    pub async fn unregister(&self) -> Result<(), String> {
        self.stop_reg_loop.store(true, Ordering::SeqCst);
        let _ = self.hangup().await;
        *self.udp_socket.lock() = None;
        self.emit_registration_status(RegistrationStatus::Disconnected, None);
        Ok(())
    }
}
