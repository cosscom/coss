/**
 * An environment's Sign settings: which sites may embed the signing page, how it looks, and the
 * consent text signers accept before they see a document.
 */
import { createHash } from "node:crypto";
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import { SignError } from "./errors.ts";
import {
  DEFAULT_SIGN_DISCLOSURE,
  MAX_SIGN_ORIGINS,
  type SignSettingsObjectOutput,
  type SignTheme,
  type UpdateSignSettingsRequestOutput,
} from "./schemas.ts";

const { environment, organization, signSettings } = schema;

export type SignSettings = {
  allowedOrigins: string[];
  displayName: string | null;
  accentColor: string | null;
  theme: SignTheme;
  disclosure: string | null;
  emailFrom: string | null;
  reminderIntervalDays: number | null;
};

const DEFAULT_SETTINGS: SignSettings = {
  allowedOrigins: [],
  displayName: null,
  accentColor: null,
  theme: "system",
  disclosure: null,
  emailFrom: null,
  reminderIntervalDays: null,
};

/** The environment's settings (defaults when never saved). */
export async function getSignSettings(input: {
  organizationId: string;
  environmentId: string;
}): Promise<SignSettings> {
  const [row] = await db
    .select()
    .from(signSettings)
    .where(
      and(
        eq(signSettings.organizationId, input.organizationId),
        eq(signSettings.environmentId, input.environmentId),
      ),
    )
    .limit(1);
  if (!row) return DEFAULT_SETTINGS;
  return {
    allowedOrigins: row.allowedOrigins,
    displayName: row.displayName,
    accentColor: row.accentColor,
    theme: row.theme as SignTheme,
    disclosure: row.disclosure,
    emailFrom: row.emailFrom,
    reminderIntervalDays: row.reminderIntervalDays,
  };
}

export function toSignSettingsObject(settings: SignSettings): SignSettingsObjectOutput {
  return {
    object: "sign_settings",
    allowed_origins: settings.allowedOrigins,
    display_name: settings.displayName,
    accent_color: settings.accentColor,
    theme: settings.theme,
    disclosure: settings.disclosure,
    email_from: settings.emailFrom,
    reminder_interval_days: settings.reminderIntervalDays,
  };
}

/**
 * Normalizes an origin allowed to embed the signing page: `https://host[:port]` only;
 * `http://localhost` and `http://127.0.0.1` too in sandbox environments.
 */
export function checkedSignOrigin(value: string, mode: "live" | "sandbox"): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new SignError("invalid_origin", `${value} is not a URL like https://app.example.com.`, {
      param: "allowed_origins",
    });
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const allowedScheme =
    url.protocol === "https:" || (url.protocol === "http:" && local && mode === "sandbox");
  if (!allowedScheme || url.username || url.password || url.origin === "null") {
    throw new SignError(
      "invalid_origin",
      mode === "sandbox"
        ? `${value} must be an https:// origin (or http://localhost).`
        : `${value} must be an https:// origin.`,
      { param: "allowed_origins" },
    );
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new SignError("invalid_origin", `${value} must be an origin, without a path.`, {
      param: "allowed_origins",
    });
  }
  return url.origin;
}

/** Changes the fields given; the others keep their values. */
export async function updateSignSettings(input: {
  organizationId: string;
  environmentId: string;
  update: UpdateSignSettingsRequestOutput;
}): Promise<SignSettings> {
  const [env] = await db
    .select({ projectId: environment.projectId, mode: environment.mode })
    .from(environment)
    .where(
      and(
        eq(environment.id, input.environmentId),
        eq(environment.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!env) throw new SignError("not_found", "Environment not found.");
  const current = await getSignSettings(input);
  const { update } = input;
  const origins =
    update.allowed_origins === undefined
      ? current.allowedOrigins
      : [...new Set(update.allowed_origins.map((origin) => checkedSignOrigin(origin, env.mode)))];
  if (origins.length > MAX_SIGN_ORIGINS) {
    throw new SignError("invalid_origin", `At most ${MAX_SIGN_ORIGINS} origins.`, {
      param: "allowed_origins",
    });
  }
  const next: SignSettings = {
    allowedOrigins: origins,
    displayName:
      update.display_name === undefined ? current.displayName : update.display_name?.trim() || null,
    accentColor:
      update.accent_color === undefined
        ? current.accentColor
        : (update.accent_color?.toLowerCase() ?? null),
    theme: update.theme ?? current.theme,
    disclosure:
      update.disclosure === undefined ? current.disclosure : update.disclosure?.trim() || null,
    emailFrom:
      update.email_from === undefined ? current.emailFrom : update.email_from?.trim() || null,
    reminderIntervalDays:
      update.reminder_interval_days === undefined
        ? current.reminderIntervalDays
        : update.reminder_interval_days,
  };
  const changed: Partial<SignSettings> = {
    ...(update.allowed_origins !== undefined ? { allowedOrigins: next.allowedOrigins } : {}),
    ...(update.display_name !== undefined ? { displayName: next.displayName } : {}),
    ...(update.accent_color !== undefined ? { accentColor: next.accentColor } : {}),
    ...(update.theme !== undefined ? { theme: next.theme } : {}),
    ...(update.disclosure !== undefined ? { disclosure: next.disclosure } : {}),
    ...(update.email_from !== undefined ? { emailFrom: next.emailFrom } : {}),
    ...(update.reminder_interval_days !== undefined
      ? { reminderIntervalDays: next.reminderIntervalDays }
      : {}),
  };
  if (Object.keys(changed).length === 0) return current;
  await db
    .insert(signSettings)
    .values({
      organizationId: input.organizationId,
      projectId: env.projectId,
      environmentId: input.environmentId,
      ...next,
    })
    // Only what this update sets: a concurrent update of other settings keeps its values.
    .onConflictDoUpdate({ target: signSettings.environmentId, set: changed });
  return getSignSettings(input);
}

/** Who signers see as the requester: the settings' display name, else the organization's. */
export async function requesterName(input: {
  organizationId: string;
  settings: SignSettings;
}): Promise<string> {
  if (input.settings.displayName) return input.settings.displayName;
  const [row] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);
  return row?.name ?? "The sender";
}

/** The consent text a signer sees, with the requester's name filled in, and its SHA-256. */
export function signDisclosure(
  settings: SignSettings,
  name: string,
): { text: string; sha256: string } {
  const text = (settings.disclosure ?? DEFAULT_SIGN_DISCLOSURE).replaceAll("{name}", name);
  return { text, sha256: createHash("sha256").update(text).digest("hex") };
}
