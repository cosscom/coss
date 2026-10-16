import {
  ListSuppressedDestinationsCommand,
  ListTenantsCommand,
  PutConfigurationSetSuppressionOptionsCommand,
  PutTenantSuppressionAttributesCommand,
  type SESv2Client,
} from "@aws-sdk/client-sesv2";
import { db, schema } from "@coss/db";
import { TENANT_SUPPRESSION, tenantNameFor } from "@coss/email/ses";
import { and, asc, eq, gt, or } from "drizzle-orm";

const { emailTenant, emailSuppression, emailEvent, environment } = schema;

/** Offline upgrade: stop sends/domain changes and drain SES events before running bootstrap. */
export async function migrateSesSuppressions(
  ses: Pick<SESv2Client, "send">,
  input: { configurationSets: string[]; tenantPrefix: string },
): Promise<number> {
  const prefix = tenantNameFor(input.tenantPrefix, "");
  const tenants: string[] = [];
  let nextToken: string | undefined;
  do {
    const page = await ses.send(new ListTenantsCommand({ NextToken: nextToken, PageSize: 100 }));
    for (const tenant of page.Tenants ?? []) {
      if (tenant.TenantName?.startsWith(prefix)) tenants.push(tenant.TenantName);
    }
    nextToken = page.NextToken;
  } while (nextToken);

  // Import every tenant before changing any AWS protection. A missing DB mapping fails closed.
  for (const tenantName of tenants) {
    await db.transaction(async (tx) => {
      // By name (unique), never parsed: stream tenants are `<prefix>-<org>-<stream>`.
      const tenantScope = and(
        eq(emailTenant.tenantName, tenantName),
        eq(emailTenant.provider, "ses"),
      );
      const [tenant] = await tx.select().from(emailTenant).where(tenantScope).for("update");
      if (!tenant) throw new Error(`No coss.com database mapping for SES tenant ${tenantName}.`);
      if (tenant.suppressionMigratedAt) return;
      const { organizationId } = tenant;
      const environments = await tx
        .select()
        .from(environment)
        .where(and(eq(environment.organizationId, organizationId), eq(environment.mode, "live")));
      const insert = async (
        env: typeof environment.$inferSelect,
        address: string,
        reason: "bounce" | "complaint",
        emailId: string | null = null,
      ) => {
        address = address.toLowerCase();
        if (address.endsWith("@simulator.amazonses.com")) return;
        await tx
          .insert(emailSuppression)
          .values({
            organizationId,
            projectId: env.projectId,
            environmentId: env.id,
            address,
            reason,
            scope: "*",
            emailId,
          })
          .onConflictDoNothing({
            target: [
              emailSuppression.environmentId,
              emailSuppression.address,
              emailSuppression.scope,
            ],
          });
      };

      // Read stored events directly: replay through ingestion is intentionally deduplicated.
      for (const env of environments) {
        let after: string | undefined;
        for (;;) {
          const events = await tx
            .select()
            .from(emailEvent)
            .where(
              and(
                eq(emailEvent.organizationId, organizationId),
                eq(emailEvent.environmentId, env.id),
                eq(emailEvent.provider, "ses"),
                or(eq(emailEvent.type, "email.bounced"), eq(emailEvent.type, "email.complained")),
                after ? gt(emailEvent.id, after) : undefined,
              ),
            )
            .orderBy(asc(emailEvent.id))
            .limit(500);
          for (const event of events) {
            if (!event.recipient) continue;
            if (event.type === "email.complained") {
              await insert(env, event.recipient, "complaint", event.emailId);
            } else if (event.details.bounce?.type === "permanent") {
              // Include historical SES suppression bounces, including the global list, which
              // cannot be exported. They are evidence this environment previously blocked mail.
              await insert(env, event.recipient, "bounce", event.emailId);
            }
          }
          if (events.length < 500) break;
          after = events.at(-1)?.id;
        }
      }

      // SES lists have no environment attribution. Preserve their protection in every live
      // environment of this org; never seed sandbox lists. Import the account list conservatively
      // as well, since old deployments used account scope (one AWS account/region per stage).
      for (const source of [undefined, tenantName]) {
        let token: string | undefined;
        do {
          const page = await ses.send(
            new ListSuppressedDestinationsCommand({
              TenantName: source,
              NextToken: token,
              PageSize: 1000,
            }),
          );
          for (const entry of page.SuppressedDestinationSummaries ?? []) {
            if (!entry.EmailAddress || !["BOUNCE", "COMPLAINT"].includes(entry.Reason ?? "")) {
              throw new Error("Invalid SES suppression entry; refusing to disable protection.");
            }
            for (const env of environments) {
              await insert(
                env,
                entry.EmailAddress,
                entry.Reason === "BOUNCE" ? "bounce" : "complaint",
              );
            }
          }
          token = page.NextToken;
        } while (token);
      }
      await tx.update(emailTenant).set({ suppressionMigratedAt: new Date() }).where(tenantScope);
    });
  }

  // A failed AWS call can be retried without reimporting entries users subsequently remove.
  for (const tenantName of tenants) {
    await ses.send(
      new PutTenantSuppressionAttributesCommand({
        TenantName: tenantName,
        ...TENANT_SUPPRESSION,
      }),
    );
  }
  for (const configurationSet of input.configurationSets) {
    await ses.send(
      new PutConfigurationSetSuppressionOptionsCommand({
        ConfigurationSetName: configurationSet,
        ...TENANT_SUPPRESSION,
      }),
    );
  }
  return tenants.length;
}
