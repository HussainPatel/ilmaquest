// Excludes visually ambiguous characters (0/O, 1/I) so codes are easy to
// read aloud and type on a phone, matching the "shared secret like a Kahoot
// PIN" design in docs/ARCHITECTURE.md.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
