import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { registerPushDevice } from "./devices.ts";
import type { PushTarget } from "./recipients.ts";
import type { ApnsEnvironment, PushCategory } from "./schemas.ts";
import type { PushMessage, PushResult, PushSender } from "./send.ts";

/** Records what it was asked to send; `answer` decides each device's result (delivered by default). */
export class FakePushSender implements PushSender {
  sent: { target: PushTarget; message: PushMessage }[] = [];
  answer: (target: PushTarget) => PushResult = () => ({ status: "delivered" });
  environments?: ApnsEnvironment[];

  async send(target: PushTarget, message: PushMessage): Promise<PushResult> {
    const result = this.answer(target);
    if (result.status === "delivered") this.sent.push({ target, message });
    return result;
  }
}

/** An app session for the user (like a mobile sign-in) with a push registration on it. */
export async function createTestPushDevice(input: {
  userId: string;
  token?: string;
  categories?: PushCategory[];
  expiresAt?: Date;
  ssoProviderId?: string | null;
  impersonatedBy?: string | null;
}) {
  const sessionId = newId("session");
  await db.insert(schema.session).values({
    id: sessionId,
    token: newId("token"),
    userId: input.userId,
    expiresAt: input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    ssoProviderId: input.ssoProviderId ?? null,
    impersonatedBy: input.impersonatedBy ?? null,
  });
  const device = await registerPushDevice({
    userId: input.userId,
    sessionId,
    token: input.token ?? randomToken(),
    apnsEnvironment: "sandbox",
    categories: input.categories,
  });
  return { sessionId, device };
}

export function randomToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
}
