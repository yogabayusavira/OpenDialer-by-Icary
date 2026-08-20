//! RFC 3261 SIP Message Parser & Serializer

use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SipMethod {
    Register,
    Invite,
    Ack,
    Bye,
    Cancel,
    Options,
    Info,
    Other(String),
}

impl SipMethod {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Register => "REGISTER",
            Self::Invite => "INVITE",
            Self::Ack => "ACK",
            Self::Bye => "BYE",
            Self::Cancel => "CANCEL",
            Self::Options => "OPTIONS",
            Self::Info => "INFO",
            Self::Other(s) => s.as_str(),
        }
    }

    pub fn parse(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "REGISTER" => Self::Register,
            "INVITE" => Self::Invite,
            "ACK" => Self::Ack,
            "BYE" => Self::Bye,
            "CANCEL" => Self::Cancel,
            "OPTIONS" => Self::Options,
            "INFO" => Self::Info,
            _ => Self::Other(s.to_string()),
        }
    }
}

#[derive(Debug, Clone)]
pub enum SipMessage {
    Request {
        method: SipMethod,
        uri: String,
        headers: HashMap<String, String>,
        body: String,
    },
    Response {
        status_code: u16,
        reason: String,
        headers: HashMap<String, String>,
        body: String,
    },
}

impl SipMessage {
    pub fn get_header(&self, name: &str) -> Option<&String> {
        let name_lower = name.to_lowercase();
        let headers = match self {
            Self::Request { headers, .. } => headers,
            Self::Response { headers, .. } => headers,
        };

        // Standard header aliases
        let alias = match name_lower.as_str() {
            "from" | "f" => "from",
            "to" | "t" => "to",
            "via" | "v" => "via",
            "call-id" | "i" => "call-id",
            "cseq" => "cseq",
            "contact" | "m" => "contact",
            "content-type" | "c" => "content-type",
            "content-length" | "l" => "content-length",
            _ => &name_lower,
        };

        for (k, v) in headers {
            let k_low = k.to_lowercase();
            if k_low == name_lower || k_low == alias {
                return Some(v);
            }
        }
        None
    }

    pub fn serialize(&self) -> String {
        let mut out = String::new();
        match self {
            Self::Request {
                method,
                uri,
                headers,
                body,
            } => {
                out.push_str(&format!("{} {} SIP/2.0\r\n", method.as_str(), uri));
                for (k, v) in headers {
                    out.push_str(&format!("{}: {}\r\n", k, v));
                }
                out.push_str(&format!("Content-Length: {}\r\n\r\n", body.as_bytes().len()));
                out.push_str(body);
            }
            Self::Response {
                status_code,
                reason,
                headers,
                body,
            } => {
                out.push_str(&format!("SIP/2.0 {} {}\r\n", status_code, reason));
                for (k, v) in headers {
                    out.push_str(&format!("{}: {}\r\n", k, v));
                }
                out.push_str(&format!("Content-Length: {}\r\n\r\n", body.as_bytes().len()));
                out.push_str(body);
            }
        }
        out
    }

    pub fn parse(raw: &str) -> Option<Self> {
        let mut parts = raw.split("\r\n\r\n");
        let header_part = parts.next()?;
        let body = parts.next().unwrap_or("").to_string();

        let mut lines = header_part.lines();
        let start_line = lines.next()?.trim();

        let mut headers = HashMap::new();
        let mut current_header: Option<(String, String)> = None;

        for line in lines {
            if line.starts_with(' ') || line.starts_with('\t') {
                if let Some((_, ref mut val)) = current_header {
                    val.push(' ');
                    val.push_str(line.trim());
                }
            } else if let Some((k, v)) = line.split_once(':') {
                if let Some((prev_k, prev_v)) = current_header.take() {
                    headers.insert(prev_k, prev_v);
                }
                current_header = Some((k.trim().to_string(), v.trim().to_string()));
            }
        }
        if let Some((k, v)) = current_header {
            headers.insert(k, v);
        }

        if start_line.starts_with("SIP/2.0") {
            // Response: SIP/2.0 <status_code> <reason>
            let tokens: Vec<&str> = start_line.split_whitespace().collect();
            if tokens.len() >= 2 {
                let status_code: u16 = tokens[1].parse().ok()?;
                let reason = tokens[2..].join(" ");
                Some(Self::Response {
                    status_code,
                    reason,
                    headers,
                    body,
                })
            } else {
                None
            }
        } else {
            // Request: <Method> <URI> SIP/2.0
            let tokens: Vec<&str> = start_line.split_whitespace().collect();
            if tokens.len() >= 3 {
                let method = SipMethod::parse(tokens[0]);
                let uri = tokens[1].to_string();
                Some(Self::Request {
                    method,
                    uri,
                    headers,
                    body,
                })
            } else {
                None
            }
        }
    }
}
