/**
 * The worker's phases. Each call does as much as fits before `ctx.deadline` and returns where to
 * pick up (`next`, stored as the migration's cursor; `null`: the phase is done). Objects are
 * created through the products' own functions, each recorded as a `migration_item` first, so a
 * phase can always be run again from its last saved cursor.
 */
import type { PlanGate } from "@coss/billing/gate";
import { db, schema } from "@coss/db";
import {
  addAudienceContacts,
  ContactError,
  createAudience,
  createContactProperty,
  createEmailTemplate,
  createTopic,
  EmailError,
  getEmailTemplate,
  importContacts,
  importSuppressions,
  listContactPropertyRows,
  publishTemplateDraft,
  topicsByKey,
} from "@coss/email";
import { CreateEmailTemplateRequest } from "@coss/email/schemas";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  WebhookError,
  type WebhookManagementDeps,
} from "@coss/webhooks";
import { and, eq, inArray } from "drizzle-orm";
import { claimItem, finishItem, type ItemResult, itemsOf } from "./items.ts";
import { propertyKey, templateAlias, topicKey } from "./mapping/keys.ts";
import {
  MAX_PROGRESS_SAMPLES,
  type MigrationEnvironment,
  type MigrationRow,
  type MigrationSelection,
  type PhaseProgress,
} from "./migrations.ts";
import type { ConversionWarning } from "./templates/types.ts";
import { type MigrationPhase, type MigrationSource, PROVIDER_NAMES } from "./types.ts";

export type PhaseDeps = {
  /** Plan limits (contacts, webhook endpoints). */
  plans?: PlanGate | undefined;
  webhooks: WebhookManagementDeps;
};

export type PhaseContext = {
  row: MigrationRow;
  env: MigrationEnvironment;
  source: MigrationSource;
  selection: MigrationSelection;
  progress: PhaseProgress;
  deps: PhaseDeps;
  /** Epoch ms after which a phase stops and returns its cursor. */
  deadline: number;
  now: () => number;
};

export type PhaseResult = { next: unknown | null; retryAt?: Date | undefined };

type Phase = (ctx: PhaseContext, cursor: unknown) => Promise<PhaseResult>;

/** A phase stops early: it can't go on (a plan limit), the rest of the import still runs. */
export class PhaseStopped extends Error {}

const IMPORT_BATCH = 1000;

function count(progress: PhaseProgress, result: ItemResult): void {
  if (result.outcome === "created") progress.created++;
  else if (result.outcome === "existing") progress.existing++;
  else if (result.outcome === "skipped") progress.skipped++;
  else progress.invalid++;
}

function sample(progress: PhaseProgress, value: string, message: string): void {
  if (progress.samples.length < MAX_PROGRESS_SAMPLES) progress.samples.push({ value, message });
}

/** `BillingError("plan_limit_reached")`, without importing billing's server code. */
function isPlanLimit(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "plan_limit_reached";
}

/**
 * Runs `handle` for each source object from `cursor` (an index) until the deadline; at least one
 * per call, so every step makes progress.
 */
async function eachObject<T>(
  ctx: PhaseContext,
  cursor: unknown,
  objects: T[],
  handle: (object: T) => Promise<void>,
): Promise<PhaseResult> {
  const start = typeof cursor === "number" ? cursor : 0;
  for (let index = start; index < objects.length; index++) {
    if (index > start && ctx.now() >= ctx.deadline) return { next: index };
    await handle(objects[index] as T);
  }
  return { next: null };
}

/** The coss.com name each source object of a kind got, by source id. */
async function targets(
  ctx: PhaseContext,
  kind: "property" | "topic" | "audience",
): Promise<Map<string, { id: string | null; name: string | null }>> {
  const items = await itemsOf(ctx.row, kind);
  return new Map(
    items
      .filter((item) => item.outcome === "created" || item.outcome === "existing")
      .map((item) => [item.sourceId, { id: item.targetId, name: item.targetName }]),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

const properties: Phase = async (ctx, cursor) => {
  const sources = await ctx.source.properties();
  const taken = new Set(
    (await itemsOf(ctx.row, "property")).flatMap((item) =>
      item.targetName ? [item.targetName] : [],
    ),
  );
  return eachObject(ctx, cursor, sources, async (property) => {
    const item = await claimItem(ctx.row, "property", property, () =>
      propertyKey(property.name, ctx.row.provider, taken),
    );
    if (!item?.targetName) return;
    const key = item.targetName;
    let result: ItemResult;
    try {
      const created = await createContactProperty(ctx.env, {
        key,
        type: property.type,
        ...(property.fallback !== null ? { fallback: property.fallback } : {}),
      });
      result = { outcome: "created", targetId: created.id };
    } catch (error) {
      if (!(error instanceof ContactError)) throw error;
      const existing =
        error.code === "property_exists"
          ? (await listContactPropertyRows(ctx.env)).find((row) => row.key === key)
          : undefined;
      result = existing
        ? existing.type === property.type
          ? { outcome: "existing", targetId: existing.id }
          : {
              outcome: "skipped",
              message: `A ${existing.type} property named ${key} already exists; this one is a ${property.type}.`,
            }
        : { outcome: "failed", message: error.message };
    }
    count(ctx.progress, result);
    await finishItem(item, result);
  });
};

const topics: Phase = async (ctx, cursor) => {
  const sources = await ctx.source.topics();
  const taken = new Set(
    (await itemsOf(ctx.row, "topic")).flatMap((item) => (item.targetName ? [item.targetName] : [])),
  );
  return eachObject(ctx, cursor, sources, async (topic) => {
    const item = await claimItem(ctx.row, "topic", topic, () => topicKey(topic.name, taken));
    if (!item?.targetName) return;
    const key = item.targetName;
    let result: ItemResult;
    try {
      const created = await createTopic(ctx.env, {
        key,
        name: topic.name.slice(0, 100),
        description: topic.description?.slice(0, 500) ?? null,
        default_subscription: topic.defaultSubscription,
        visibility: topic.visibility,
      });
      result = { outcome: "created", targetId: created.id };
    } catch (error) {
      if (!(error instanceof ContactError)) throw error;
      const existing =
        error.code === "topic_exists" ? (await topicsByKey(ctx.env, [key])).get(key) : undefined;
      result = existing
        ? { outcome: "existing", targetId: existing.id }
        : { outcome: "failed", message: error.message };
    }
    count(ctx.progress, result);
    await finishItem(item, result);
  });
};

const audiences: Phase = async (ctx, cursor) => {
  const lists = await ctx.source.lists();
  return eachObject(ctx, cursor, lists, async (list) => {
    const name = list.name.slice(0, 200);
    const item = await claimItem(ctx.row, "audience", list, () => name);
    if (!item) return;
    let result: ItemResult;
    try {
      const created = await createAudience(ctx.env, { name });
      result = { outcome: "created", targetId: created.id };
    } catch (error) {
      if (!(error instanceof ContactError)) throw error;
      const [existing] =
        error.code === "name_taken"
          ? await db
              .select({ id: schema.audience.id })
              .from(schema.audience)
              .where(
                and(
                  eq(schema.audience.organizationId, ctx.env.organizationId),
                  eq(schema.audience.environmentId, ctx.env.environmentId),
                  eq(schema.audience.name, name),
                ),
              )
              .limit(1)
          : [];
      result = existing
        ? { outcome: "existing", targetId: existing.id }
        : { outcome: "failed", message: error.message };
    }
    count(ctx.progress, result);
    await finishItem(item, result);
  });
};

function describeWarning(warning: ConversionWarning): string {
  return `${warning.field} ${warning.line}:${warning.column}: ${warning.message}`;
}

const templates: Phase = async (ctx, cursor) => {
  const sources = await ctx.source.templates();
  const taken = new Set(
    (await itemsOf(ctx.row, "template")).flatMap((item) =>
      item.targetName ? [item.targetName] : [],
    ),
  );
  return eachObject(ctx, cursor, sources, async (summary) => {
    const item = await claimItem(ctx.row, "template", summary, () =>
      templateAlias(summary.alias, summary.name, taken),
    );
    if (!item?.targetName) return;
    const alias = item.targetName;
    const existing = await getEmailTemplate(ctx.env, alias);
    let result: ItemResult;
    if (existing) {
      result = {
        outcome: "existing",
        targetId: existing.id,
        message: `A template with the alias ${alias} already exists; it was left as it is.`,
      };
    } else {
      result = await importTemplate(ctx, summary.id, alias);
    }
    count(ctx.progress, result);
    await finishItem(item, result);
  });
};

async function importTemplate(ctx: PhaseContext, id: string, alias: string): Promise<ItemResult> {
  const template = await ctx.source.template(id);
  const { converted } = template;
  const warnings = [
    ...converted.renames.map(
      (rename) =>
        `Send ${rename.to} instead of ${rename.from} (coss.com variable names can't have dots).`,
    ),
    ...converted.warnings.map(describeWarning),
    ...template.notes,
  ];
  if (converted.html === null && converted.text === null) {
    return { outcome: "skipped", message: "It has no content.", warnings };
  }
  const parsed = CreateEmailTemplateRequest.safeParse({
    name: template.name.slice(0, 100) || alias,
    alias,
    description: `Imported from ${PROVIDER_NAMES[ctx.row.provider]}.`,
    variables: converted.variables,
    ...(converted.sampleVariables ? { sample_variables: converted.sampleVariables } : {}),
    contents: [
      {
        locale: "en",
        subject: converted.subject,
        ...(converted.html !== null ? { html: converted.html } : {}),
        ...(converted.text !== null ? { text: converted.text } : {}),
      },
    ],
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      outcome: "failed",
      message:
        `It couldn't be imported: ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`.trim(),
      warnings,
    };
  }
  let created: Awaited<ReturnType<typeof createEmailTemplate>>;
  try {
    created = await createEmailTemplate(ctx.env, parsed.data);
  } catch (error) {
    if (!(error instanceof EmailError)) throw error;
    return { outcome: "failed", message: error.message, warnings };
  }
  if (!converted.lossless) {
    return {
      outcome: "created",
      targetId: created.id,
      warnings,
      needsReview: true,
      message: "Imported as a draft: review it, then publish.",
    };
  }
  try {
    await publishTemplateDraft(ctx.env, created.id);
  } catch (error) {
    if (!(error instanceof EmailError)) throw error;
    return {
      outcome: "created",
      targetId: created.id,
      warnings,
      needsReview: true,
      message: `Imported as a draft (${error.message}).`,
    };
  }
  return { outcome: "created", targetId: created.id, warnings };
}

type PageCursor = { page: string | null; offset: number };

function pageCursor(cursor: unknown): PageCursor {
  return cursor && typeof cursor === "object" && "offset" in cursor
    ? (cursor as PageCursor)
    : { page: null, offset: 0 };
}

const contacts: Phase = async (ctx, cursor) => {
  let state = pageCursor(cursor);
  const [propertyKeys, topicKeys] = await Promise.all([
    targets(ctx, "property"),
    targets(ctx, "topic"),
  ]);
  for (;;) {
    const page = await ctx.source.contacts(state.page);
    const rest = page.items.slice(state.offset);
    for (let start = 0; start < rest.length; start += IMPORT_BATCH) {
      const batch = rest.slice(start, start + IMPORT_BATCH).map((contact) => ({
        email: contact.email,
        ...(contact.firstName ? { first_name: contact.firstName.slice(0, 200) } : {}),
        ...(contact.lastName ? { last_name: contact.lastName.slice(0, 200) } : {}),
        ...(contact.unsubscribed ? { status: "unsubscribed" as const } : {}),
        properties: Object.fromEntries(
          Object.entries(contact.properties).flatMap(([id, value]) => {
            const key = propertyKeys.get(id)?.name;
            return key && value !== null && value !== "" ? [[key, value]] : [];
          }),
        ),
        topics: contact.topics.flatMap((choice) => {
          const key = topicKeys.get(choice.topicId)?.name;
          return key ? [{ topic: key, status: choice.status }] : [];
        }),
      }));
      await importContactBatch(ctx, batch);
      if (ctx.now() >= ctx.deadline && start + IMPORT_BATCH < rest.length) {
        return { next: { page: state.page, offset: state.offset + start + IMPORT_BATCH } };
      }
    }
    if (page.retryAt) return { next: { page: page.next, offset: 0 }, retryAt: page.retryAt };
    if (page.next === null) return { next: null };
    state = { page: page.next, offset: 0 };
    if (ctx.now() >= ctx.deadline) return { next: state };
  }
};

type ContactEntry = Parameters<typeof importContacts>[1][number];

async function importContactBatch(ctx: PhaseContext, batch: ContactEntry[]): Promise<void> {
  let result: Awaited<ReturnType<typeof importContacts>>;
  try {
    result = await importContacts(ctx.env, batch, { plans: ctx.deps.plans, source: "import" });
  } catch (error) {
    if (isPlanLimit(error)) {
      throw new PhaseStopped(
        `Your plan's contact limit was reached: ${errorMessage(error)} Contacts after that weren't imported.`,
      );
    }
    throw error;
  }
  ctx.progress.created += result.created;
  ctx.progress.updated += result.updated;
  // A value the property refuses (a date in another format) drops the value, not the contact.
  const retry = result.invalid.flatMap((invalid) => {
    const entry = batch[invalid.index];
    return entry?.properties && Object.keys(entry.properties).length > 0
      ? [{ ...entry, properties: {} }]
      : [];
  });
  const retried =
    retry.length > 0 ? await importContacts(ctx.env, retry, { plans: ctx.deps.plans }) : null;
  if (retried) {
    ctx.progress.created += retried.created;
    ctx.progress.updated += retried.updated;
    if (retried.created + retried.updated > 0) {
      ctx.progress.message =
        "Some contacts were imported without property values coss.com couldn't read.";
    }
  }
  const stillInvalid = [
    ...result.invalid.filter((invalid) => {
      const entry = batch[invalid.index];
      return !(entry?.properties && Object.keys(entry.properties).length > 0);
    }),
    ...(retried?.invalid ?? []),
  ];
  ctx.progress.invalid += stillInvalid.length;
  for (const invalid of stillInvalid) sample(ctx.progress, invalid.email, invalid.message);
}

type MembershipCursor = { list: number; page: string | null };

const memberships: Phase = async (ctx, cursor) => {
  const lists = await ctx.source.lists();
  const audienceIds = await targets(ctx, "audience");
  let state: MembershipCursor =
    cursor && typeof cursor === "object" && "list" in cursor
      ? (cursor as MembershipCursor)
      : { list: 0, page: null };
  for (;;) {
    const list = lists[state.list];
    if (!list) return { next: null };
    const audienceId = audienceIds.get(list.id)?.id;
    if (!audienceId) {
      state = { list: state.list + 1, page: null };
      continue;
    }
    const page = await ctx.source.members(list.id, state.page);
    for (let start = 0; start < page.items.length; start += IMPORT_BATCH) {
      const added = await addAudienceContacts(
        ctx.env,
        audienceId,
        page.items.slice(start, start + IMPORT_BATCH),
      );
      if (added) {
        ctx.progress.created += added.added;
        ctx.progress.existing += added.existing;
        ctx.progress.skipped += added.missing.length;
      }
    }
    if (page.retryAt) return { next: { ...state, page: page.next }, retryAt: page.retryAt };
    state =
      page.next === null ? { list: state.list + 1, page: null } : { ...state, page: page.next };
    if (ctx.now() >= ctx.deadline) return { next: state };
  }
};

const suppressions: Phase = async (ctx, cursor) => {
  let state = pageCursor(cursor);
  const topicKeys = await targets(ctx, "topic");
  for (;;) {
    const page = await ctx.source.suppressions(state.page);
    const entries: Parameters<typeof importSuppressions>[1] = [];
    const topicOptOuts: { email: string; topic: string }[] = [];
    for (const item of page.items.slice(state.offset)) {
      if (item.scope.kind === "topic") {
        const key = topicKeys.get(item.scope.topicId)?.name;
        if (!key) {
          ctx.progress.skipped++;
          continue;
        }
        topicOptOuts.push({ email: item.address, topic: key });
        continue;
      }
      entries.push({
        address: item.address,
        scope: item.scope.kind === "all" ? "*" : "stream:marketing",
        reason: item.reason,
        createdAt: item.createdAt ?? undefined,
      });
    }
    // An unsubscribe from a topic: a contact's opt-out (they can opt in again from the
    // preference center), or a suppression for that category when there's no contact.
    const optOuts = await contactsAmong(
      ctx.env,
      topicOptOuts.map((entry) => entry.email),
    );
    const contactChoices = topicOptOuts.filter((entry) => optOuts.has(entry.email.toLowerCase()));
    for (const entry of topicOptOuts) {
      if (!optOuts.has(entry.email.toLowerCase())) {
        entries.push({ address: entry.email, scope: entry.topic, reason: "unsubscribe" });
      }
    }
    for (let start = 0; start < contactChoices.length; start += IMPORT_BATCH) {
      const result = await importContacts(
        ctx.env,
        contactChoices.slice(start, start + IMPORT_BATCH).map((entry) => ({
          email: entry.email,
          topics: [{ topic: entry.topic, status: "opted_out" as const }],
        })),
        { plans: ctx.deps.plans },
      );
      ctx.progress.updated += result.updated;
    }
    for (let start = 0; start < entries.length; start += IMPORT_BATCH) {
      const result = await importSuppressions(ctx.env, entries.slice(start, start + IMPORT_BATCH));
      if (!result) throw new Error("The environment is gone.");
      ctx.progress.created += result.created;
      ctx.progress.existing += result.existing;
      ctx.progress.invalid += result.invalid.length;
      for (const invalid of result.invalid) sample(ctx.progress, invalid.address, invalid.message);
    }
    if (page.retryAt) return { next: { page: page.next, offset: 0 }, retryAt: page.retryAt };
    if (page.next === null) return { next: null };
    state = { page: page.next, offset: 0 };
    if (ctx.now() >= ctx.deadline) return { next: state };
  }
};

/** Which of `addresses` are contacts of the environment (lower-cased). */
async function contactsAmong(env: MigrationEnvironment, addresses: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const unique = [...new Set(addresses.map((address) => address.trim().toLowerCase()))];
  for (let start = 0; start < unique.length; start += IMPORT_BATCH) {
    const rows = await db
      .select({ address: schema.contact.address })
      .from(schema.contact)
      .where(
        and(
          eq(schema.contact.organizationId, env.organizationId),
          eq(schema.contact.environmentId, env.environmentId),
          inArray(schema.contact.address, unique.slice(start, start + IMPORT_BATCH)),
        ),
      );
    for (const row of rows) found.add(row.address);
  }
  return found;
}

const webhooks: Phase = async (ctx, cursor) => {
  const sources = await ctx.source.webhooks();
  return eachObject(ctx, cursor, sources, async (hook) => {
    const item = await claimItem(
      ctx.row,
      "webhook_endpoint",
      { id: hook.id, name: hook.name },
      () => hook.url,
    );
    if (!item) return;
    const warnings = [
      ...hook.notes,
      ...(hook.unmapped.length > 0
        ? [`Not on coss.com, left out: ${hook.unmapped.join(", ")}.`]
        : []),
    ];
    let result: ItemResult;
    const existing = (await listWebhookEndpoints(ctx.env)).find(
      (endpoint) => endpoint.url === hook.url,
    );
    if (existing) {
      result = { outcome: "existing", targetId: existing.id, warnings };
    } else if (hook.eventTypes.length === 0) {
      // An empty list would mean every event.
      result = { outcome: "skipped", message: "None of its events exist on coss.com.", warnings };
    } else {
      try {
        const { endpoint } = await createWebhookEndpoint(
          {
            ...ctx.env,
            url: hook.url,
            description: `Imported from ${PROVIDER_NAMES[ctx.row.provider]}: ${hook.name}`.slice(
              0,
              200,
            ),
            eventTypes: hook.eventTypes,
            apiVersion: ctx.selection.webhookApiVersion,
            userId: ctx.row.createdByUserId,
            enabled: false,
          },
          ctx.deps.webhooks,
        );
        result = {
          outcome: "created",
          targetId: endpoint.id,
          warnings,
          needsReview: true,
          message:
            "Created disabled: update your handler to verify coss.com's signature with the endpoint's new secret, then enable it.",
        };
      } catch (error) {
        if (!(error instanceof WebhookError)) throw error;
        result = { outcome: "failed", message: error.message, warnings };
      }
    }
    count(ctx.progress, result);
    await finishItem(item, result);
  });
};

export const PHASES: Readonly<Record<MigrationPhase, Phase>> = {
  properties,
  topics,
  audiences,
  templates,
  contacts,
  memberships,
  suppressions,
  webhooks,
};
