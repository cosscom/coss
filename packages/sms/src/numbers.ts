/** The organization's phone numbers (`sms_number`, ids `num_`). */
import { db, schema } from "@coss/db";
import { and, asc, eq } from "drizzle-orm";
import type { SmsNumberObjectOutput } from "./schemas.ts";

const { smsAccount, smsNumber, smsRegistration } = schema;

export type SmsNumberRow = typeof smsNumber.$inferSelect;

export type SmsNumberWithRegistration = {
  number: SmsNumberRow;
  registration: typeof smsRegistration.$inferSelect | null;
};

/** Every number of the organization with its registration, oldest first. */
export async function listSmsNumbers(organizationId: string): Promise<SmsNumberWithRegistration[]> {
  return db
    .select({ number: smsNumber, registration: smsRegistration })
    .from(smsNumber)
    .leftJoin(
      smsRegistration,
      and(
        eq(smsRegistration.id, smsNumber.registrationId),
        eq(smsRegistration.organizationId, smsNumber.organizationId),
      ),
    )
    .where(eq(smsNumber.organizationId, organizationId))
    .orderBy(asc(smsNumber.createdAt), asc(smsNumber.id));
}

/** Whether live sends can go from the number now (its registration approved, the account active). */
export async function canSendFrom(
  organizationId: string,
  row: SmsNumberWithRegistration,
): Promise<boolean> {
  if (row.number.status !== "active" || row.registration?.status !== "approved") return false;
  const [account] = await db
    .select({ status: smsAccount.status })
    .from(smsAccount)
    .where(eq(smsAccount.organizationId, organizationId))
    .limit(1);
  return account?.status === "active";
}

/** The API's view of the organization's numbers, from one environment's key. */
export async function listSmsNumberObjects(input: {
  organizationId: string;
  environmentId: string;
}): Promise<SmsNumberObjectOutput[]> {
  const rows = await listSmsNumbers(input.organizationId);
  const objects: SmsNumberObjectOutput[] = [];
  for (const row of rows) {
    objects.push({
      object: "sms_number",
      id: row.number.id,
      phone_number: row.number.phoneNumber,
      kind: row.number.kind,
      country: row.number.country,
      status: row.number.status,
      registration_status: row.registration?.status ?? null,
      can_send: await canSendFrom(input.organizationId, row),
      receives_here: row.number.receivingEnvironmentId === input.environmentId,
      created_at: row.number.createdAt.toISOString(),
    });
  }
  return objects;
}
