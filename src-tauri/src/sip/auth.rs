use md5::{Digest, Md5};

pub fn md5_hex(data: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(data.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[derive(Debug, Clone, Default)]
pub struct DigestChallenge {
    pub realm: String,
    pub nonce: String,
    pub opaque: Option<String>,
    pub qop: Option<String>,
    pub algorithm: Option<String>,
}

impl DigestChallenge {
    pub fn parse(header_value: &str) -> Option<Self> {
        let trimmed = header_value.trim();
        let digest_prefix = if trimmed.starts_with("Digest ") {
            &trimmed[7..]
        } else if trimmed.starts_with("digest ") {
            &trimmed[7..]
        } else {
            trimmed
        };

        let mut challenge = DigestChallenge::default();

        for part in digest_prefix.split(',') {
            let part = part.trim();
            if let Some((key, val)) = part.split_once('=') {
                let key = key.trim();
                let val = val.trim().trim_matches('"');
                match key.to_lowercase().as_str() {
                    "realm" => challenge.realm = val.to_string(),
                    "nonce" => challenge.nonce = val.to_string(),
                    "opaque" => challenge.opaque = Some(val.to_string()),
                    "qop" => challenge.qop = Some(val.to_string()),
                    "algorithm" => challenge.algorithm = Some(val.to_string()),
                    _ => {}
                }
            }
        }

        if !challenge.realm.is_empty() && !challenge.nonce.is_empty() {
            Some(challenge)
        } else {
            None
        }
    }

    pub fn compute_response(
        &self,
        username: &str,
        password: &str,
        method: &str,
        uri: &str,
        cnonce: Option<&str>,
        nc: Option<&str>,
    ) -> String {
        let ha1 = md5_hex(&format!("{}:{}:{}", username, self.realm, password));
        let ha2 = md5_hex(&format!("{}:{}", method, uri));

        if let (Some(qop), Some(cnonce_str), Some(nc_str)) = (&self.qop, cnonce, nc) {
            if qop.contains("auth") {
                return md5_hex(&format!("{}:{}:{}:{}:{}:{}", ha1, self.nonce, nc_str, cnonce_str, "auth", ha2));
            }
        }

        md5_hex(&format!("{}:{}:{}", ha1, self.nonce, ha2))
    }

    pub fn format_auth_header(
        &self,
        username: &str,
        password: &str,
        method: &str,
        uri: &str,
        header_name: &str,
    ) -> String {
        let cnonce = format!("{:x}", rand::random::<u64>());
        let nc = "00000001";
        let response = self.compute_response(username, password, method, uri, Some(&cnonce), Some(nc));

        let mut out = format!(
            "{}: Digest username=\"{}\", realm=\"{}\", nonce=\"{}\", uri=\"{}\", response=\"{}\"",
            header_name, username, self.realm, self.nonce, uri, response
        );

        if let Some(opaque) = &self.opaque {
            out.push_str(&format!(", opaque=\"{}\"", opaque));
        }

        if let Some(qop) = &self.qop {
            if qop.contains("auth") {
                out.push_str(&format!(", qop=auth, nc={}, cnonce=\"{}\"", nc, cnonce));
            }
        }

        if let Some(algo) = &self.algorithm {
            out.push_str(&format!(", algorithm={}", algo));
        }

        out
    }
}
