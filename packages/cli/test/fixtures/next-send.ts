// Server-only: a Next.js route handler or server action. The development key stays in
// .env.local as COSS_API_KEY. Never hardcode a live key.
import { Coss, type EmailEvent } from "coss";
import { diagnoseEmail } from "coss/diagnose";

export async function sendAndDiagnose(
  fetchImpl: typeof fetch,
  events: EmailEvent[],
): Promise<{ id: string; verdict: string } | { error: string }> {
  const coss = new Coss({ apiKey: process.env.COSS_API_KEY, fetch: fetchImpl, maxRetries: 0 });
  const { data, error } = await coss.email.send({
    from: "Acme <hello@example.com>",
    to: ["bounce@simulator.amazonses.com"],
    subject: "Hello from coss.com",
    text: "It works.",
  });
  if (error) return { error: error.hint ?? error.message };
  const diagnosis = diagnoseEmail({ email: data, events });
  return { id: data.id, verdict: diagnosis.verdict };
}
