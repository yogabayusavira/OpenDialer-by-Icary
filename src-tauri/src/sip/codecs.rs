//! Fast G.711 PCMU (u-law) and PCMA (A-law) audio compression and decompression

pub fn linear_to_ulaw(sample: i16) -> u8 {
    let mut pcm_val = sample;
    let mask: u8;

    let sign = if pcm_val < 0 {
        pcm_val = -pcm_val;
        0
    } else {
        0x80
    };

    if pcm_val > 32635 {
        pcm_val = 32635;
    }
    pcm_val += 0x84;

    let exponent = if pcm_val >= 0x4000 {
        7
    } else if pcm_val >= 0x2000 {
        6
    } else if pcm_val >= 0x1000 {
        5
    } else if pcm_val >= 0x0800 {
        4
    } else if pcm_val >= 0x0400 {
        3
    } else if pcm_val >= 0x0200 {
        2
    } else if pcm_val >= 0x0100 {
        1
    } else {
        0
    };

    let mantissa = ((pcm_val >> (exponent + 3)) & 0x0F) as u8;
    mask = (exponent << 4) | mantissa;
    !(sign | mask)
}

pub fn ulaw_to_linear(ulaw_byte: u8) -> i16 {
    let ulaw = !ulaw_byte;
    let sign = ulaw & 0x80;
    let exponent = ((ulaw >> 4) & 0x07) as i32;
    let mantissa = (ulaw & 0x0F) as i32;

    let mut t = ((mantissa << 3) + 0x84) << exponent;
    t -= 0x84;

    if sign != 0 {
        t as i16
    } else {
        (-t) as i16
    }
}

pub fn linear_to_alaw(sample: i16) -> u8 {
    let mut pcm_val = sample;
    let mask: u8;

    let sign = if pcm_val >= 0 {
        0xD5
    } else {
        pcm_val = -pcm_val - 1;
        0x55
    };

    let exponent = if pcm_val >= 0x4000 {
        7
    } else if pcm_val >= 0x2000 {
        6
    } else if pcm_val >= 0x1000 {
        5
    } else if pcm_val >= 0x0800 {
        4
    } else if pcm_val >= 0x0400 {
        3
    } else if pcm_val >= 0x0200 {
        2
    } else if pcm_val >= 0x0100 {
        1
    } else {
        0
    };

    let mantissa = if exponent == 0 {
        ((pcm_val >> 4) & 0x0F) as u8
    } else {
        ((pcm_val >> (exponent + 3)) & 0x0F) as u8
    };

    mask = (exponent << 4) | mantissa;
    sign ^ mask
}

pub fn alaw_to_linear(alaw_byte: u8) -> i16 {
    let alaw = alaw_byte ^ 0x55;
    let sign = alaw & 0x80;
    let exponent = ((alaw >> 4) & 0x07) as i32;
    let mantissa = (alaw & 0x0F) as i32;

    let t = if exponent == 0 {
        (mantissa << 4) + 8
    } else {
        ((mantissa << 4) + 0x108) << (exponent - 1)
    };

    if sign != 0 {
        t as i16
    } else {
        (-t) as i16
    }
}

pub fn encode_pcm_to_pcmu(samples: &[i16]) -> Vec<u8> {
    samples.iter().map(|&s| linear_to_ulaw(s)).collect()
}

pub fn decode_pcmu_to_pcm(bytes: &[u8]) -> Vec<i16> {
    bytes.iter().map(|&b| ulaw_to_linear(b)).collect()
}

pub fn encode_pcm_to_pcma(samples: &[i16]) -> Vec<u8> {
    samples.iter().map(|&s| linear_to_alaw(s)).collect()
}

pub fn decode_pcma_to_pcm(bytes: &[u8]) -> Vec<i16> {
    bytes.iter().map(|&b| alaw_to_linear(b)).collect()
}
