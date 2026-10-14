/**
 * An environment's rules: "block sign-ups with a disposable email from a data center". Rules are
 * tried in `position` order (then age) after the lists; the first enabled one whose conditions
 * match decides. Conditions test the fields of `RULE_FIELDS`, computed from the assessment's
 * signals (`RuleFacts`); a field without a value never matches.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, eq } from "drizzle-orm";
import { RiskError } from "./errors.ts";
import {
  type CreateRiskRuleRequestOutput,
  MAX_RISK_RULES,
  type RiskDecision,
  type RiskEvent,
  type RiskRuleConditionOutput,
  type RiskRuleListOutput,
  type RiskRuleOutput,
  type RuleField,
  type UpdateRiskRuleRequestOutput,
} from "./schemas.ts";

const { riskRule } = schema;

export type RiskRuleRow = typeof riskRule.$inferSelect;

type Scope = { organizationId: string; environmentId: string };

/** What rules can see of an assessment: every `RULE_FIELDS` value (`null`: unknown). */
export type RuleFacts = Record<RuleField, boolean | number | string | null>;

export function toRiskRuleObject(row: RiskRuleRow): RiskRuleOutput {
  return {
    object: "risk_rule",
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    position: row.position,
    events: row.events as RiskEvent[],
    match: row.match,
    conditions: row.conditions as RiskRuleConditionOutput[],
    action: row.action,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function inScope(scope: Scope) {
  return and(
    eq(riskRule.organizationId, scope.organizationId),
    eq(riskRule.environmentId, scope.environmentId),
  );
}

/** Every rule of the environment, in evaluation order. */
export async function listRiskRuleRows(executor: Executor, scope: Scope): Promise<RiskRuleRow[]> {
  return executor
    .select()
    .from(riskRule)
    .where(inScope(scope))
    .orderBy(asc(riskRule.position), asc(riskRule.createdAt), asc(riskRule.id));
}

export async function listRiskRules(scope: Scope): Promise<RiskRuleListOutput> {
  const rows = await listRiskRuleRows(db, scope);
  return { object: "list", data: rows.map(toRiskRuleObject), has_more: false };
}

export async function getRiskRule(scope: Scope, id: string): Promise<RiskRuleOutput | null> {
  if (!isId("rskrule", id)) return null;
  const [row] = await db
    .select()
    .from(riskRule)
    .where(and(inScope(scope), eq(riskRule.id, id)))
    .limit(1);
  return row ? toRiskRuleObject(row) : null;
}

/** `null` when the environment isn't in the organization. */
export async function createRiskRule(
  scope: Scope,
  params: CreateRiskRuleRequestOutput,
): Promise<RiskRuleOutput | null> {
  return db.transaction(async (tx) => {
    const [environment] = await tx
      .select({ projectId: schema.environment.projectId })
      .from(schema.environment)
      .where(
        and(
          eq(schema.environment.id, scope.environmentId),
          eq(schema.environment.organizationId, scope.organizationId),
        ),
      )
      // Serializes creates, so the limit holds under concurrency.
      .for("update")
      .limit(1);
    if (!environment) return null;
    const [existing] = await tx.select({ total: count() }).from(riskRule).where(inScope(scope));
    if ((existing?.total ?? 0) >= MAX_RISK_RULES) {
      throw new RiskError(
        "too_many_rules",
        `An environment can have at most ${MAX_RISK_RULES} rules. Delete or merge some first.`,
      );
    }
    const [row] = await tx
      .insert(riskRule)
      .values({
        ...scope,
        projectId: environment.projectId,
        name: params.name,
        enabled: params.enabled ?? true,
        position: params.position ?? 0,
        events: [...new Set(params.events ?? [])],
        match: params.match ?? "all",
        conditions: params.conditions,
        action: params.action,
      })
      .returning();
    if (!row) throw new Error("Risk rule insert returned no row.");
    return toRiskRuleObject(row);
  });
}

export async function updateRiskRule(
  scope: Scope,
  id: string,
  params: UpdateRiskRuleRequestOutput,
): Promise<RiskRuleOutput | null> {
  if (!isId("rskrule", id)) return null;
  const [row] = await db
    .update(riskRule)
    .set({
      ...(params.name === undefined ? {} : { name: params.name }),
      ...(params.enabled === undefined ? {} : { enabled: params.enabled }),
      ...(params.position === undefined ? {} : { position: params.position }),
      ...(params.events === undefined ? {} : { events: [...new Set(params.events)] }),
      ...(params.match === undefined ? {} : { match: params.match }),
      ...(params.conditions === undefined ? {} : { conditions: params.conditions }),
      ...(params.action === undefined ? {} : { action: params.action }),
      updatedAt: new Date(),
    })
    .where(and(inScope(scope), eq(riskRule.id, id)))
    .returning();
  return row ? toRiskRuleObject(row) : null;
}

export async function deleteRiskRule(scope: Scope, id: string): Promise<RiskRuleOutput | null> {
  if (!isId("rskrule", id)) return null;
  const [row] = await db
    .delete(riskRule)
    .where(and(inScope(scope), eq(riskRule.id, id)))
    .returning();
  return row ? toRiskRuleObject(row) : null;
}

function conditionHolds(condition: RiskRuleConditionOutput, facts: RuleFacts): boolean {
  const actual = facts[condition.field];
  if (actual === null || actual === undefined) return false;
  const expected = condition.value;
  switch (condition.operator) {
    case "is":
    case "eq":
      return typeof actual === "string" && typeof expected === "string"
        ? actual.toLowerCase() === expected.toLowerCase()
        : actual === expected;
    case "neq":
      return typeof actual === "string" && typeof expected === "string"
        ? actual.toLowerCase() !== expected.toLowerCase()
        : actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
    case "not_in": {
      if (!Array.isArray(expected)) return false;
      const found = expected.some((item) => item.toLowerCase() === String(actual).toLowerCase());
      return condition.operator === "in" ? found : !found;
    }
  }
}

/** The first enabled rule for `event` whose conditions hold, or `null`. */
export function firstMatchingRule(
  rules: readonly RiskRuleRow[],
  event: RiskEvent,
  facts: RuleFacts,
): { id: string; name: string; action: RiskDecision } | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.events.length > 0 && !rule.events.includes(event)) continue;
    const conditions = rule.conditions as RiskRuleConditionOutput[];
    const matched =
      rule.match === "any"
        ? conditions.some((condition) => conditionHolds(condition, facts))
        : conditions.every((condition) => conditionHolds(condition, facts));
    if (matched) return { id: rule.id, name: rule.name, action: rule.action };
  }
  return null;
}
