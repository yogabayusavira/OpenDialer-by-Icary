use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransportProtocol {
    Udp,
    Tcp,
    Tls,
}

impl Default for TransportProtocol {
    fn default() -> Self {
        Self::Udp
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SipAccountConfig {
    pub username: String,
    pub password: String,
    pub domain: String,
    pub server: String,
    pub port: Option<u16>,
    pub auth_username: Option<String>,
    pub caller_id: Option<String>,
    pub display_name: Option<String>,
    #[serde(default)]
    pub transport: TransportProtocol,
    pub outbound_proxy: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RegistrationStatus {
    Disconnected,
    Connecting,
    Registered,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CallStatus {
    Idle,
    Dialing,
    Ringing,
    Connected,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallStatePayload {
    pub state: CallStatus,
    pub destination: Option<String>,
    pub caller_id: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrationStatusPayload {
    pub status: RegistrationStatus,
    pub message: Option<String>,
}
