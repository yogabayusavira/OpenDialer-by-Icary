pub mod audio;
pub mod auth;
pub mod codecs;
pub mod message;
pub mod rtp;
pub mod sdp;
pub mod transport;
pub mod types;
pub mod client;

use std::sync::Arc;
use tauri::State;
pub use client::SipClient;
pub use types::SipAccountConfig;

#[tauri::command]
pub async fn sip_register(
    account: SipAccountConfig,
    client: State<'_, Arc<SipClient>>,
) -> Result<(), String> {
    client.register(account).await
}

#[tauri::command]
pub async fn sip_unregister(client: State<'_, Arc<SipClient>>) -> Result<(), String> {
    client.unregister().await
}

#[tauri::command]
pub async fn sip_call(
    destination: String,
    client: State<'_, Arc<SipClient>>,
) -> Result<(), String> {
    client.call(destination).await
}

#[tauri::command]
pub async fn sip_hangup(client: State<'_, Arc<SipClient>>) -> Result<(), String> {
    client.hangup().await
}

#[tauri::command]
pub async fn sip_mute(
    muted: bool,
    client: State<'_, Arc<SipClient>>,
) -> Result<(), String> {
    client.set_muted(muted);
    Ok(())
}

#[tauri::command]
pub async fn sip_send_dtmf(
    digits: String,
    client: State<'_, Arc<SipClient>>,
) -> Result<(), String> {
    client.send_dtmf(digits).await
}
