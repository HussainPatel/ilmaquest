import { randomBytes, createHash } from "node:crypto";

// Format: "iq_" prefix (so a leaked token is instantly recognizable in logs)
// + 32 random bytes, hex-encoded. Only the SHA-256 hash is ever stored —
// lookups are by exact hash match via the DB index, not a string compare
// in application code, so no separate timing-safe comparison is needed.
export function generateExtensionToken(): string {
  return `iq_${randomBytes(32).toString("hex")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
