//! RFC 3550 RTP Packet Header and Payload Handling

#[derive(Debug, Clone)]
pub struct RtpPacket {
    pub version: u8,
    pub padding: bool,
    pub extension: bool,
    pub marker: bool,
    pub payload_type: u8,
    pub sequence_number: u16,
    pub timestamp: u32,
    pub ssrc: u32,
    pub payload: Vec<u8>,
}

impl RtpPacket {
    pub fn new(payload_type: u8, sequence_number: u16, timestamp: u32, ssrc: u32, marker: bool, payload: Vec<u8>) -> Self {
        Self {
            version: 2,
            padding: false,
            extension: false,
            marker,
            payload_type,
            sequence_number,
            timestamp,
            ssrc,
            payload,
        }
    }

    pub fn serialize(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(12 + self.payload.len());
        
        let byte0 = (self.version << 6) | (if self.padding { 0x20 } else { 0 }) | (if self.extension { 0x10 } else { 0 });
        bytes.push(byte0);

        let byte1 = (if self.marker { 0x80 } else { 0 }) | (self.payload_type & 0x7F);
        bytes.push(byte1);

        bytes.extend_from_slice(&self.sequence_number.to_be_bytes());
        bytes.extend_from_slice(&self.timestamp.to_be_bytes());
        bytes.extend_from_slice(&self.ssrc.to_be_bytes());

        bytes.extend_from_slice(&self.payload);
        bytes
    }

    pub fn parse(data: &[u8]) -> Option<Self> {
        if data.len() < 12 {
            return None;
        }

        let version = data[0] >> 6;
        if version != 2 {
            return None;
        }

        let padding = (data[0] & 0x20) != 0;
        let extension = (data[0] & 0x10) != 0;
        let cc = data[0] & 0x0F;

        let marker = (data[1] & 0x80) != 0;
        let payload_type = data[1] & 0x7F;

        let sequence_number = u16::from_be_bytes([data[2], data[3]]);
        let timestamp = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
        let ssrc = u32::from_be_bytes([data[8], data[9], data[10], data[11]]);

        let header_len = 12 + (cc as usize * 4);
        if data.len() < header_len {
            return None;
        }

        let mut payload_start = header_len;
        if extension {
            if data.len() < payload_start + 4 {
                return None;
            }
            let ext_len = u16::from_be_bytes([data[payload_start + 2], data[payload_start + 3]]) as usize * 4;
            payload_start += 4 + ext_len;
        }

        if data.len() < payload_start {
            return None;
        }

        let mut payload_end = data.len();
        if padding && payload_end > payload_start {
            let pad_len = data[payload_end - 1] as usize;
            if pad_len <= payload_end - payload_start {
                payload_end -= pad_len;
            }
        }

        let payload = data[payload_start..payload_end].to_vec();

        Some(Self {
            version,
            padding,
            extension,
            marker,
            payload_type,
            sequence_number,
            timestamp,
            ssrc,
            payload,
        })
    }

    /// Create RFC 4733 DTMF telephone-event payload
    pub fn create_dtmf_payload(event: u8, end_of_event: bool, volume: u8, duration: u16) -> Vec<u8> {
        let mut out = Vec::with_capacity(4);
        out.push(event);
        let e_r_vol = (if end_of_event { 0x80 } else { 0 }) | (volume & 0x3F);
        out.push(e_r_vol);
        out.extend_from_slice(&duration.to_be_bytes());
        out
    }
}

pub fn dtmf_char_to_event(ch: char) -> Option<u8> {
    match ch {
        '0'..='9' => Some(ch as u8 - b'0'),
        '*' => Some(10),
        '#' => Some(11),
        'A' | 'a' => Some(12),
        'B' | 'b' => Some(13),
        'C' | 'c' => Some(14),
        'D' | 'd' => Some(15),
        _ => None,
    }
}
