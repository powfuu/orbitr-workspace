/// Incrementally decodes a byte stream into UTF-8 strings, carrying over
/// multi-byte sequences split across read boundaries.
#[derive(Default)]
pub struct Utf8Stream {
    pending: Vec<u8>,
}

impl Utf8Stream {
    pub fn push(&mut self, bytes: &[u8]) -> String {
        self.pending.extend_from_slice(bytes);
        let valid_up_to = match std::str::from_utf8(&self.pending) {
            Ok(_) => self.pending.len(),
            // An incomplete trailing sequence: keep it for the next chunk.
            Err(e) if e.error_len().is_none() => e.valid_up_to(),
            // Genuinely invalid bytes: decode lossily and reset.
            Err(_) => {
                let out = String::from_utf8_lossy(&self.pending).into_owned();
                self.pending.clear();
                return out;
            }
        };
        let rest = self.pending.split_off(valid_up_to);
        let out = String::from_utf8(std::mem::replace(&mut self.pending, rest)).unwrap_or_default();
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn joins_split_multibyte_chars() {
        let mut s = Utf8Stream::default();
        let bytes = "a❯b".as_bytes();
        assert_eq!(s.push(&bytes[..2]), "a");
        assert_eq!(s.push(&bytes[2..]), "❯b");
    }
}
