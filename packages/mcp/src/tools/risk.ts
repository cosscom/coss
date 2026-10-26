import type { RiskAssessment, RiskDecision, RiskListEntry, RiskRule } from "coss";
import { z } from "zod";
import { ok, respond, run, unwrap } from "../result.ts";
import {
  compact,
  cursorSchema,
  limitSchema,
  nextCursor,
  READ_ONLY,
  type ToolContext,
  WRITE,
} from "./shared.ts";

const EVENTS = ["signup", "login", "message", "checkout", "custom"] as const;
const DECISIONS = ["allow", "review", "block"] as const;

function decisionNext(decision: RiskDecision): string {
  switch (decision) {
    case "allow":
      return "Allow: continue.";
    case "review":
      return "Review: a person needs to look at this before continuing.";
    case "block":
      return "Block: refuse this event.";
  }
}

function assessmentSummary(assessment: RiskAssessment): object {
  return compact({
    id: assessment.id,
    event: assessment.event,
    event_name: assessment.event_name,
    decision: assessment.decision,
    score: assessment.score,
    reasons: assessment.reasons.map((reason) => ({ code: reason.code, message: reason.message })),
    review_status: assessment.review_status,
    user_email: assessment.user.email,
    next: decisionNext(assessment.decision),
  });
}

function ruleSummary(rule: RiskRule): object {
  return compact({
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    position: rule.position,
    action: rule.action,
    events: rule.events,
  });
}

function entrySummary(entry: RiskListEntry): object {
  return compact({
    id: entry.id,
    list: entry.list,
    type: entry.type,
    value: entry.value,
    note: entry.note,
    expires_at: entry.expires_at,
  });
}

export function registerRiskTools(ctx: ToolContext): void {
  const { server, coss } = ctx;

  server.registerTool(
    "assess_risk",
    {
      title: "Assess a risk event",
      description:
        "Assesses one sign-up, login, message, checkout or custom event and records the " +
        "decision (allow, review or block). Pass the user's email and their IP, not the " +
        "server's. The answer is the decision, score, reasons and what to do next — not every signal.",
      inputSchema: z.object({
        event: z.enum(EVENTS).describe("signup, login, message, checkout or custom."),
        event_name: z
          .string()
          .optional()
          .describe("Required for custom events (for example invite_sent)."),
        user_id: z.string().optional().describe("Your id for the user, when it exists."),
        email: z.string().optional().describe("The email address the user gave."),
        ip: z.string().optional().describe("The client's IP address."),
        user_agent: z.string().optional().describe("The client's user agent."),
        content: z
          .string()
          .optional()
          .describe("Text the user wrote, classified with the event and not stored."),
      }),
      annotations: WRITE,
    },
    (args) =>
      respond(
        coss.risk.assess({
          event: args.event,
          ...(args.event_name ? { event_name: args.event_name } : {}),
          ...(args.user_id || args.email
            ? {
                user: {
                  ...(args.user_id ? { id: args.user_id } : {}),
                  ...(args.email ? { email: args.email } : {}),
                },
              }
            : {}),
          ...(args.ip ? { ip: args.ip } : {}),
          ...(args.user_agent ? { user_agent: args.user_agent } : {}),
          ...(args.content ? { content: { text: args.content } } : {}),
        }),
        assessmentSummary,
      ),
  );

  server.registerTool(
    "list_risk_assessments",
    {
      title: "List risk assessments",
      description:
        "Recent risk assessments in this environment, newest first. `review_status: open` is " +
        "the review queue. Each row is the decision and reasons, without the full signal payload.",
      inputSchema: z.object({
        event: z.enum(EVENTS).optional(),
        decision: z.enum(DECISIONS).optional(),
        review_status: z.enum(["open", "resolved"]).optional(),
        user_id: z.string().optional(),
        limit: limitSchema(20),
        cursor: cursorSchema,
      }),
      annotations: READ_ONLY,
    },
    ({ event, decision, review_status, user_id, limit, cursor }) =>
      run(async () => {
        const page = unwrap(
          await coss.risk.assessments.list({
            ...(event ? { event } : {}),
            ...(decision ? { decision } : {}),
            ...(review_status ? { review_status } : {}),
            ...(user_id ? { user_id } : {}),
            limit,
            ...(cursor ? { after: cursor } : {}),
          }),
        );
        return ok({
          assessments: page.data.map(assessmentSummary),
          next_cursor: nextCursor(page),
        });
      }),
  );

  server.registerTool(
    "list_risk_rules",
    {
      title: "List risk rules",
      description:
        "Every risk rule, in the order they are tried: name, whether each is enabled, its " +
        "position and the decision it makes (allow, review or block).",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    () =>
      run(async () => {
        const page = unwrap(await coss.risk.rules.list());
        return ok({ rules: page.data.map(ruleSummary) });
      }),
  );

  server.registerTool(
    "list_risk_list_entries",
    {
      title: "List risk allow and block entries",
      description:
        "Entries on this environment's risk allow and block lists. An allow-list match decides " +
        "allow; a block-list match decides block.",
      inputSchema: z.object({
        list: z.enum(["allow", "block"]).optional(),
        limit: limitSchema(50),
        cursor: cursorSchema,
      }),
      annotations: READ_ONLY,
    },
    ({ list, limit, cursor }) =>
      run(async () => {
        const page = unwrap(
          await coss.risk.lists.list({
            ...(list ? { list } : {}),
            limit,
            ...(cursor ? { after: cursor } : {}),
          }),
        );
        return ok({ entries: page.data.map(entrySummary), next_cursor: nextCursor(page) });
      }),
  );
}
