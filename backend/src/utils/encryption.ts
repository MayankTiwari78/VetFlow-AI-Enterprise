import crypto from "node:crypto";

import { env } from "../config/env.js";

const key = (): Buffer =>
  crypto.createHash("sha256").update(env.TWO_FACTOR_ENCRYPTION_KEY).digest();

export const encryptString = (value: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString("base64url")).join(".");
};

export const decryptString = (value: string): string => {
  const [ivEncoded, authTagEncoded, encryptedEncoded] = value.split(".");

  if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
    throw new Error("Encrypted value is malformed");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivEncoded, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64url")),
    decipher.final()
  ]).toString("utf8");
};
