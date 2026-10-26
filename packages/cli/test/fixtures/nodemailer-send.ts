// Server-only: Nodemailer's transport runs on the server. The development key stays in the env
// file as COSS_API_KEY. Never hardcode a live key.
//
// What coss init prints for a project that already uses Nodemailer:
//   import { cossTransport } from "coss/nodemailer";
//   import nodemailer from "nodemailer";
//   const transport = nodemailer.createTransport(cossTransport());
import type { Email, EmailEvent } from "coss";
import { diagnoseEmail } from "coss/diagnose";
import { cossTransport, type NodemailerMailMessage } from "coss/nodemailer";

const TO = "bounce@simulator.amazonses.com";

export async function sendAndDiagnose(
  fetchImpl: typeof fetch,
  events: EmailEvent[],
): Promise<{ id: string; verdict: string } | { error: string }> {
  const transport = cossTransport({ apiKey: process.env.COSS_API_KEY, fetch: fetchImpl });
  const mail: NodemailerMailMessage = {
    data: {
      from: "Acme <hello@example.com>",
      to: TO,
      subject: "Hello from coss.com",
      text: "It works.",
    },
    message: { getEnvelope: () => ({ from: "hello@example.com", to: [TO] }) },
    normalize: (callback) => {
      callback(null, {
        from: { address: "hello@example.com", name: "Acme" },
        to: [{ address: TO }],
        subject: "Hello from coss.com",
        text: "It works.",
      });
    },
  };
  const sent = await new Promise<Email | { error: string }>((resolve) => {
    transport.send(mail, (error, info) => {
      if (error || !info) resolve({ error: error?.message ?? "Send failed." });
      else resolve(info.email);
    });
  });
  if ("error" in sent) return sent;
  const diagnosis = diagnoseEmail({ email: sent, events });
  return { id: sent.id, verdict: diagnosis.verdict };
}
