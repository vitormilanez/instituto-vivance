import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function encryptionKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) throw new Error("Meet key unavailable");
  return key;
}
export function seal(value: string, key: Buffer, binding: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(binding));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}
export function unseal(value: string, key: Buffer, binding: string) {
  const [version, iv, tag, ciphertext, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext || extra) throw new Error("Meet credential unavailable");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(binding));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function nonce() { return randomBytes(32).toString("base64url"); }
