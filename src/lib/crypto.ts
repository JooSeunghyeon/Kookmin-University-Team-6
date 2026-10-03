import crypto from "node:crypto";

/**
 * Server-only helpers for encrypting real name / student number (13장 규칙:
 * 실명·학번 암호화) and hashing the student number for duplicate detection.
 */

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

export function encryptField(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptField(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Deterministic hash used for UNIQUE(school_id, student_no_hash) duplicate checks. */
export function hashStudentNo(schoolId: string, studentNo: string): string {
  const key = getKey();
  return crypto
    .createHmac("sha256", key)
    .update(`${schoolId}:${studentNo.trim()}`)
    .digest("hex");
}
