#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sip;

use sip::{sip_call, sip_hangup, sip_mute, sip_register, sip_send_dtmf, sip_unregister, SipClient};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let client = SipClient::new(app.handle().clone());
            app.manage(client);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sip_register,
            sip_unregister,
            sip_call,
            sip_hangup,
            sip_mute,
            sip_send_dtmf
        ])
        .run(tauri::generate_context!())
        .expect("error while running Icary OpenDialer");
}
