//! SIP Direct UDP & TCP Socket Transport

use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::UdpSocket;
use tokio::sync::mpsc;
use crate::sip::message::SipMessage;

pub async fn create_udp_transport(
    remote_host: &str,
    remote_port: u16,
) -> Result<(Arc<UdpSocket>, SocketAddr, String, u16), String> {
    let remote_addr_str = format!("{}:{}", remote_host, remote_port);
    let remote_addr: SocketAddr = tokio::net::lookup_host(&remote_addr_str)
        .await
        .map_err(|e| format!("Failed to resolve SIP host {}: {}", remote_host, e))?
        .next()
        .ok_or_else(|| format!("No IP found for host {}", remote_host))?;

    let socket = UdpSocket::bind("0.0.0.0:0")
        .await
        .map_err(|e| format!("Failed to bind local UDP socket: {}", e))?;

    // Probe local outgoing IP by connecting socket to target
    socket.connect(remote_addr).await.map_err(|e| format!("Socket connect probe failed: {}", e))?;
    let local_addr = socket.local_addr().map_err(|e| format!("Failed to get local address: {}", e))?;

    let local_ip = local_addr.ip().to_string();
    let local_port = local_addr.port();

    Ok((Arc::new(socket), remote_addr, local_ip, local_port))
}

pub fn spawn_udp_receiver(
    socket: Arc<UdpSocket>,
    incoming_tx: mpsc::UnboundedSender<SipMessage>,
) {
    tokio::spawn(async move {
        let mut buf = vec![0u8; 65535];
        loop {
            match socket.recv(&mut buf).await {
                Ok(len) => {
                    if let Ok(text) = std::str::from_utf8(&buf[..len]) {
                        if let Some(msg) = SipMessage::parse(text) {
                            let _ = incoming_tx.send(msg);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("UDP SIP socket receive error: {}", e);
                    break;
                }
            }
        }
    });
}
