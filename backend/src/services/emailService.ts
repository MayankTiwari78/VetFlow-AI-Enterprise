import net from "node:net";
import tls from "node:tls";

import { env } from "../config/env.js";
import type { AuthChallengePurpose } from "../constants/auth.js";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  purpose: AuthChallengePurpose;
  previewToken?: string;
  previewOtp?: string;
}

const developmentOutbox: EmailMessage[] = [];

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const dotStuff = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");

const encodeHeader = (value: string): string => value.replace(/\r|\n/g, " ");

const envelopeAddress = (value: string): string => {
  const angleMatch = /<([^>]+)>/.exec(value);
  return (angleMatch?.[1] ?? value).trim();
};

class SmtpClient {
  private socket: net.Socket | tls.TLSSocket | undefined;

  public async connect(): Promise<void> {
    this.socket = env.SMTP_SECURE
      ? tls.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT, servername: env.SMTP_HOST })
      : net.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT });

    await new Promise<void>((resolve, reject) => {
      const socket = this.requireSocket();
      socket.once(env.SMTP_SECURE ? "secureConnect" : "connect", () => resolve());
      socket.once("error", reject);
    });

    await this.readResponse();
    const ehlo = await this.command("EHLO medflow-ai.local", "2");

    if (!env.SMTP_SECURE && ehlo.includes("STARTTLS")) {
      await this.command("STARTTLS", "2");
      this.socket = tls.connect({ socket: this.requireSocket(), servername: env.SMTP_HOST });
      await new Promise<void>((resolve, reject) => {
        const socket = this.requireSocket();
        socket.once("secureConnect", () => resolve());
        socket.once("error", reject);
      });
      await this.command("EHLO medflow-ai.local", "2");
    }

    if (env.SMTP_USER || env.SMTP_PASSWORD) {
      await this.command("AUTH LOGIN", "3");
      await this.command(Buffer.from(env.SMTP_USER).toString("base64"), "3");
      await this.command(Buffer.from(env.SMTP_PASSWORD).toString("base64"), "2");
    }
  }

  public async send(message: EmailMessage): Promise<void> {
    await this.command(`MAIL FROM:<${envelopeAddress(env.EMAIL_FROM)}>`, "2");
    await this.command(`RCPT TO:<${message.to}>`, "2");
    await this.command("DATA", "3");
    this.writeData(formatRawEmail(message));
    await this.readResponse("2");
  }

  public async quit(): Promise<void> {
    if (!this.socket) {
      return;
    }

    await this.command("QUIT", "2").catch(() => undefined);
    this.socket.end();
  }

  private requireSocket(): net.Socket | tls.TLSSocket {
    if (!this.socket) {
      throw new Error("SMTP socket is not connected");
    }

    return this.socket;
  }

  private async command(command: string, expectedPrefix: "2" | "3"): Promise<string> {
    this.requireSocket().write(`${command}\r\n`);
    return this.readResponse(expectedPrefix);
  }

  private writeData(data: string): void {
    this.requireSocket().write(`${dotStuff(data)}\r\n.\r\n`);
  }

  private async readResponse(expectedPrefix?: "2" | "3"): Promise<string> {
    const socket = this.requireSocket();

    const response = await new Promise<string>((resolve, reject) => {
      let buffer = "";

      const cleanup = (): void => {
        socket.off("data", onData);
        socket.off("error", onError);
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const onData = (chunk: Buffer): void => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const finalLine = lines.find((line) => /^\d{3} /.test(line));

        if (finalLine) {
          cleanup();
          resolve(buffer);
        }
      };

      socket.on("data", onData);
      socket.once("error", onError);
    });

    if (expectedPrefix && !response.startsWith(expectedPrefix)) {
      throw new Error("SMTP provider rejected the email request");
    }

    return response;
  }
}

const formatRawEmail = (message: EmailMessage): string => {
  const boundary = `medflow-${Date.now()}`;

  return [
    `From: ${encodeHeader(env.EMAIL_FROM)}`,
    `To: ${encodeHeader(message.to)}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "",
    message.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "",
    message.html,
    "",
    `--${boundary}--`
  ].join("\r\n");
};

const deliver = async (message: EmailMessage): Promise<void> => {
  if (!env.isProduction) {
    developmentOutbox.push(message);
    return;
  }

  const client = new SmtpClient();

  try {
    await client.connect();
    await client.send(message);
  } finally {
    await client.quit();
  }
};

export const getDevelopmentEmailOutbox = (): readonly EmailMessage[] => developmentOutbox;

export const clearDevelopmentEmailOutbox = (): void => {
  developmentOutbox.splice(0, developmentOutbox.length);
};

export const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const link = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await deliver({
    to,
    purpose: "EMAIL_VERIFICATION",
    subject: "Verify your MedFlow AI account",
    text: `MedFlow AI Enterprise\n\nVerify your email by opening this link: ${link}\n\nThis link expires soon.`,
    html: `<p><strong>MedFlow AI Enterprise</strong></p><p>Verify your email by opening this secure link:</p><p><a href="${escapeHtml(
      link
    )}">Verify email</a></p><p>This link expires soon.</p>`,
    previewToken: env.isProduction ? undefined : token
  });
};

export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  const link = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await deliver({
    to,
    purpose: "PASSWORD_RESET",
    subject: "Reset your MedFlow AI password",
    text: `MedFlow AI Enterprise\n\nReset your password by opening this link: ${link}\n\nThis link expires soon.`,
    html: `<p><strong>MedFlow AI Enterprise</strong></p><p>Reset your password by opening this secure link:</p><p><a href="${escapeHtml(
      link
    )}">Reset password</a></p><p>This link expires soon.</p>`,
    previewToken: env.isProduction ? undefined : token
  });
};

export const sendOtpEmail = async (
  to: string,
  purpose: AuthChallengePurpose,
  otp: string
): Promise<void> => {
  await deliver({
    to,
    purpose,
    subject: "Your MedFlow AI verification code",
    text: `MedFlow AI Enterprise\n\nYour verification code is ${otp}. It expires soon.`,
    html: `<p><strong>MedFlow AI Enterprise</strong></p><p>Your verification code is <strong>${escapeHtml(
      otp
    )}</strong>.</p><p>It expires soon.</p>`,
    previewOtp: env.isProduction ? undefined : otp
  });
};
