import { z } from "zod";
import { failWith, ok, respond, run, unwrap } from "../result.ts";
import {
  cursorSchema,
  DESTRUCTIVE,
  limitSchema,
  nextCursor,
  READ_ONLY,
  type ToolContext,
  WRITE,
} from "./shared.ts";

export function registerSuppressionTools(ctx: ToolContext): void {
  const { server, coss } = ctx;

  server.registerTool(
    "check_suppression",
    {
      title: "Check a suppressed address",
      description:
        "Whether emails to an address would be skipped because of the environment's suppression " +
        "list (hard bounces, spam complaints and manual entries), and the entries that match.",
      inputSchema: z.object({
        address: z.string(),
        category: z
          .string()
          .optional()
          .describe(
            "The category of the email you plan to send; without it only entries for every email count.",
          ),
      }),
      annotations: READ_ONLY,
    },
    (args) => respond(coss.email.suppressions.check(args)),
  );

  server.registerTool(
    "list_suppressions",
    {
      title: "List suppressed addresses",
      description: "The environment's suppression list, newest first.",
      inputSchema: z.object({
        address: z.string().optional(),
        scope: z.string().optional().describe('"*" (every email) or a category.'),
        limit: limitSchema(20),
        cursor: cursorSchema,
      }),
      annotations: READ_ONLY,
    },
    ({ cursor, ...params }) =>
      respond(coss.email.suppressions.list({ ...params, after: cursor }), (list) => ({
        suppressions: list.data,
        next_cursor: nextCursor(list),
      })),
  );

  server.registerTool(
    "add_suppression",
    {
      title: "Suppress an address",
      description: "Adds an address to the suppression list, so emails to it are skipped.",
      inputSchema: z.object({
        address: z.string(),
        scope: z
          .string()
          .optional()
          .describe('"*" (the default: every email) or a category, to only skip emails of it.'),
      }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    (args) => respond(coss.email.suppressions.add(args)),
  );

  server.registerTool(
    "remove_suppression",
    {
      title: "Unsuppress an address",
      description:
        "Removes suppression entries, by entry id or for an address (optionally one scope), so the " +
        "address receives emails again. Only do this when the address is known to work and wants " +
        "the emails: sending to addresses that bounced or complained hurts the sender's reputation.",
      inputSchema: z.object({
        id: z.string().optional().describe("The entry id (sup_…)."),
        address: z.string().optional().describe("Remove the address's entries instead."),
        scope: z.string().optional().describe("With `address`: only the entry of this scope."),
      }),
      annotations: DESTRUCTIVE,
    },
    (args) =>
      run(async () => {
        if (args.id) {
          return ok({ removed: [unwrap(await coss.email.suppressions.remove(args.id))] });
        }
        if (!args.address) return failWith("Pass `id` or `address`.");
        const entries = unwrap(
          await coss.email.suppressions.list({
            address: args.address,
            scope: args.scope,
            limit: 100,
          }),
        ).data;
        const removed = [];
        for (const entry of entries) {
          removed.push(unwrap(await coss.email.suppressions.remove(entry.id)));
        }
        return ok({
          removed,
          ...(removed.length === 0 ? { note: "The address had no matching entry." } : {}),
        });
      }),
  );
}
