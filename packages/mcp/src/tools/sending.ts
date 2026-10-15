import { z } from "zod";
import { ok, run, unwrap } from "../result.ts";
import { emailListItem } from "./emails.ts";
import { DESTRUCTIVE, SENDS, type ToolContext, WRITE } from "./shared.ts";

const addresses = z.union([z.string(), z.array(z.string()).min(1)]);

function modeNote(ctx: ToolContext): string {
  switch (ctx.mode) {
    case "sandbox":
      return " This server uses a sandbox (coss_test_) key: nothing is delivered, any `from` works, and outcomes are simulated (e.g. bounce@simulator.amazonses.com bounces).";
    case "live":
      return " This server uses a live (coss_live_) key: the email is really delivered, from a verified domain only.";
    default:
      return "";
  }
}

export function registerSendingTools(ctx: ToolContext): void {
  const { server, coss } = ctx;

  server.registerTool(
    "send_email",
    {
      title: "Send an email",
      description:
        "Sends an email from this API key's environment (useful to test a flow end to end). It is " +
        "queued and handed to the provider moments later; follow up with diagnose_email." +
        modeNote(ctx),
      inputSchema: z.object({
        from: z.string().describe('Sender, e.g. "Acme <hello@acme.com>".'),
        to: addresses,
        subject: z.string().min(1),
        html: z.string().optional(),
        text: z.string().optional(),
        cc: addresses.optional(),
        bcc: addresses.optional(),
        reply_to: addresses.optional(),
        category: z
          .string()
          .optional()
          .describe('Groups emails for suppression scopes and tracking rules, e.g. "marketing".'),
        tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        scheduled_at: z
          .string()
          .optional()
          .describe("ISO 8601 time with an offset, at most 30 days ahead: send later."),
        tracking: z
          .object({
            opens: z.boolean().optional(),
            clicks: z.boolean().optional(),
            unsubscribe: z
              .boolean()
              .optional()
              .describe(
                "One-click unsubscribe headers; needs a category and a single recipient. An " +
                  "unsubscribe suppresses the recipient for that category.",
              ),
          })
          .optional(),
        idempotency_key: z
          .string()
          .optional()
          .describe(
            "Repeat a call with the same key and body to get the same email back instead of a second send.",
          ),
      }),
      annotations: SENDS,
    },
    ({ idempotency_key, ...params }) =>
      run(async () => {
        const email = unwrap(
          await coss.email.send(params, idempotency_key ? { idempotencyKey: idempotency_key } : {}),
        );
        return ok({
          email: emailListItem(email),
          next: `Call diagnose_email with email_id "${email.id}" in a few seconds for the outcome.`,
        });
      }),
  );

  server.registerTool(
    "cancel_email",
    {
      title: "Cancel a scheduled email",
      description: "Cancels an email that is still scheduled. Anything else can't be canceled.",
      inputSchema: z.object({ id: z.string().describe("The email id (email_…).") }),
      annotations: DESTRUCTIVE,
    },
    ({ id }) => run(async () => ok({ email: emailListItem(unwrap(await coss.email.cancel(id))) })),
  );

  server.registerTool(
    "reschedule_email",
    {
      title: "Reschedule an email",
      description: "Moves a still-scheduled email to a new time (at most 30 days ahead).",
      inputSchema: z.object({
        id: z.string().describe("The email id (email_…)."),
        scheduled_at: z.string().describe("ISO 8601 time with an offset."),
      }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    ({ id, scheduled_at }) =>
      run(async () =>
        ok({ email: emailListItem(unwrap(await coss.email.reschedule(id, { scheduled_at }))) }),
      ),
  );
}
