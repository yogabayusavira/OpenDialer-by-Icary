//! RFC 4566 Session Description Protocol (SDP) Parser & Generator

#[derive(Debug, Clone)]
pub struct SdpSession {
    pub connection_ip: String,
    pub audio_port: u16,
    pub codecs: Vec<u8>,
    pub dtmf_payload_type: Option<u8>,
}

impl SdpSession {
    pub fn build_offer(local_ip: &str, rtp_port: u16, session_id: u64) -> String {
        let mut sdp = String::new();
        sdp.push_str("v=0\r\n");
        sdp.push_str(&format!("o=- {} 1 IN IP4 {}\r\n", session_id, local_ip));
        sdp.push_str("s=OpenDialer\r\n");
        sdp.push_str(&format!("c=IN IP4 {}\r\n", local_ip));
        sdp.push_str("t=0 0\r\n");
        sdp.push_str(&format!("m=audio {} RTP/AVP 0 8 101\r\n", rtp_port));
        sdp.push_str("a=rtpmap:0 PCMU/8000\r\n");
        sdp.push_str("a=rtpmap:8 PCMA/8000\r\n");
        sdp.push_str("a=rtpmap:101 telephone-event/8000\r\n");
        sdp.push_str("a=fmtp:101 0-16\r\n");
        sdp.push_str("a=sendrecv\r\n");
        sdp.push_str("a=ptime:20\r\n");
        sdp
    }

    pub fn build_answer(local_ip: &str, rtp_port: u16, session_id: u64, selected_codec: u8) -> String {
        let mut sdp = String::new();
        sdp.push_str("v=0\r\n");
        sdp.push_str(&format!("o=- {} 2 IN IP4 {}\r\n", session_id, local_ip));
        sdp.push_str("s=OpenDialer\r\n");
        sdp.push_str(&format!("c=IN IP4 {}\r\n", local_ip));
        sdp.push_str("t=0 0\r\n");
        sdp.push_str(&format!("m=audio {} RTP/AVP {} 101\r\n", rtp_port, selected_codec));
        if selected_codec == 0 {
            sdp.push_str("a=rtpmap:0 PCMU/8000\r\n");
        } else {
            sdp.push_str("a=rtpmap:8 PCMA/8000\r\n");
        }
        sdp.push_str("a=rtpmap:101 telephone-event/8000\r\n");
        sdp.push_str("a=fmtp:101 0-16\r\n");
        sdp.push_str("a=sendrecv\r\n");
        sdp.push_str("a=ptime:20\r\n");
        sdp
    }

    pub fn parse(sdp_text: &str) -> Option<Self> {
        let mut connection_ip = String::new();
        let mut audio_port: u16 = 0;
        let mut codecs: Vec<u8> = Vec::new();
        let mut dtmf_payload_type: Option<u8> = None;

        for line in sdp_text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if line.starts_with("c=IN IP4 ") {
                connection_ip = line[9..].trim().to_string();
            } else if line.starts_with("c=IN IP6 ") {
                connection_ip = line[9..].trim().to_string();
            } else if line.starts_with("m=audio ") {
                let parts: Vec<&str> = line[8..].split_whitespace().collect();
                if let Some(port_str) = parts.first() {
                    if let Ok(p) = port_str.parse::<u16>() {
                        audio_port = p;
                    }
                }
                // codecs listed after RTP/AVP or RTP/SAVP
                if parts.len() >= 3 {
                    for &fmt in &parts[2..] {
                        if let Ok(pt) = fmt.parse::<u8>() {
                            codecs.push(pt);
                        }
                    }
                }
            } else if line.starts_with("a=rtpmap:") {
                let rtpmap = &line[9..];
                if let Some((pt_str, enc)) = rtpmap.split_once(' ') {
                    if enc.to_lowercase().starts_with("telephone-event") {
                        if let Ok(pt) = pt_str.parse::<u8>() {
                            dtmf_payload_type = Some(pt);
                        }
                    }
                }
            }
        }

        if !connection_ip.is_empty() && audio_port > 0 {
            Some(Self {
                connection_ip,
                audio_port,
                codecs,
                dtmf_payload_type,
            })
        } else {
            None
        }
    }
}
