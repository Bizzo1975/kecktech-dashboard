import crypto from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generate a random base32 TOTP secret (20 bytes → 32 chars). */
export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32ToBuffer(secret: string): Buffer {
  const cleaned = secret.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

/** Verify a 6-digit TOTP code (±1 step window). */
export function verifyTotp(
  secret: string,
  token: string,
  window = 1,
  stepSeconds = 30
): boolean {
  const cleaned = String(token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned) || !secret) return false;
  const key = base32ToBuffer(secret);
  const counter = Math.floor(Date.now() / 1000 / stepSeconds);
  for (let w = -window; w <= window; w++) {
    if (hotp(key, counter + w) === cleaned) return true;
  }
  return false;
}

export function otpauthUrl(email: string, secret: string, issuer = "Kecktech CMS"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const iss = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${iss}&digits=6&period=30`;
}
