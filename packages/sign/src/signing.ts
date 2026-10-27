/**
 * What a signer does on the signing page, through an authenticated session: open the request
 * (`viewed`), agree to sign electronically (`consented`, with the consent text's SHA-256), read the
 * documents, then sign (field values and an adopted signature image) or decline. Each action is
 * one transaction with its audit trail event, webhook and log line. The last signature completes
 * the request.
 */
import { createHash } from "node:crypto";
import { db, schema, type Transaction } from "@coss/db";
import type { SignAnchor, SignPageSize } from "@coss/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { SignError } from "./errors.ts";
import type { SignActor } from "./events.ts";
import { recordSignEvent } from "./record.ts";
import type { SignFieldType, SignRequestStatus, SignSignerStatus, SignTheme } from "./schemas.ts";
import {
  checkSignable,
  checkSignerOpen,
  type SignSessionAccess,
  type SignSignerRow,
} from "./sessions.ts";
import { getSignSettings, requesterName, signDisclosure } from "./settings.ts";
import { type DocumentStore, organizationPrefix } from "./store.ts";

const { signDocument, signField, signRequest, signRequestDocument, signSigner } = schema;

type RequestRow = typeof signRequest.$inferSelect;
type FieldRow = typeof signField.$inferSelect;

/** At most this many bytes of PNG per adopted signature or initials. */
export const MAX_SIGNATURE_IMAGE_BYTES = 512 * 1024;
const MAX_SIGNATURE_IMAGE_SIDE = 4000;
export const MAX_TEXT_FIELD_LENGTH = 1000;
export const MAX_DECLINE_REASON_LENGTH = 1000;

/** What the signing page shows: the signer's own fields, never other signers' values. */
export type SigningView = {
  request: {
    id: string;
    title: string;
    message: string | null;
    status: SignRequestStatus;
    signing_order: "parallel" | "sequential";
    expires_at: string | null;
  };
  signer: {
    id: string;
    name: string;
    email: string;
    status: SignSignerStatus;
    consented: boolean;
    signed_at: string | null;
    declined_at: string | null;
  };
  requester: { name: string };
  branding: { accent_color: string | null; theme: SignTheme };
  disclosure: { text: string; sha256: string };
  documents: { id: string; filename: string; pages: SignPageSize[] }[];
  fields: {
    id: string;
    document_id: string;
    type: SignFieldType;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    required: boolean;
    label: string | null;
  }[];
  /** Sequential order: the signers who have to sign first. */
  waiting_for: { name: string }[];
  /** The signer can sign or decline now. */
  can_sign: boolean;
  /** The organization is suspended: nothing can be signed. */
  read_only: boolean;
  sandbox: boolean;
};

type Loaded = {
  request: RequestRow;
  signer: SignSignerRow;
  signers: SignSignerRow[];
  documents: {
    id: string;
    filename: string;
    sha256: string;
    pages: SignPageSize[];
    anchors: SignAnchor[];
  }[];
  fields: FieldRow[];
};

function sessionGone(): SignError {
  return new SignError("not_found", "This signing link is invalid or has expired.");
}

async function load(executor: typeof db | Transaction, access: SignSessionAccess): Promise<Loaded> {
  const { session } = access;
  const [request] = await executor
    .select()
    .from(signRequest)
    .where(
      and(
        eq(signRequest.id, session.requestId),
        eq(signRequest.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!request) throw sessionGone();
  // One after the other: a transaction's client runs one query at a time.
  const signers = await executor
    .select()
    .from(signSigner)
    .where(
      and(
        eq(signSigner.requestId, request.id),
        eq(signSigner.organizationId, request.organizationId),
      ),
    )
    .orderBy(asc(signSigner.position), asc(signSigner.id));
  const documents = await executor
    .select({
      id: signDocument.id,
      filename: signDocument.filename,
      sha256: signDocument.sha256,
      pages: signDocument.pages,
      anchors: signDocument.anchors,
    })
    .from(signRequestDocument)
    .innerJoin(
      signDocument,
      and(
        eq(signDocument.id, signRequestDocument.documentId),
        eq(signDocument.organizationId, signRequestDocument.organizationId),
      ),
    )
    .where(
      and(
        eq(signRequestDocument.requestId, request.id),
        eq(signRequestDocument.organizationId, request.organizationId),
      ),
    )
    .orderBy(asc(signRequestDocument.position));
  const fields = await executor
    .select()
    .from(signField)
    .where(
      and(
        eq(signField.signerId, session.signerId),
        eq(signField.organizationId, request.organizationId),
      ),
    )
    .orderBy(asc(signField.page), asc(signField.y), asc(signField.x));
  const signer = signers.find((candidate) => candidate.id === session.signerId);
  if (!signer) throw sessionGone();
  return { request, signer, signers, documents, fields };
}

/** Sequential order: the signers before this one who haven't signed yet. */
function waitingFor(loaded: Loaded): SignSignerRow[] {
  if (loaded.request.signingOrder !== "sequential") return [];
  return loaded.signers.filter(
    (other) => other.position < loaded.signer.position && other.status !== "signed",
  );
}

function documentHashes(loaded: Loaded): Record<string, string> {
  return Object.fromEntries(loaded.documents.map((document) => [document.id, document.sha256]));
}

/** The request can be signed and this signer hasn't signed or declined yet. */
function isOpen(loaded: Loaded, now: Date): boolean {
  try {
    checkSignable(loaded.request, now);
    checkSignerOpen(loaded.signer);
    return true;
  } catch {
    return false;
  }
}

function canSign(loaded: Loaded, access: SignSessionAccess, now: Date): boolean {
  return !access.readOnly && waitingFor(loaded).length === 0 && isOpen(loaded, now);
}

function writable(access: SignSessionAccess): void {
  if (access.readOnly) {
    throw new SignError(
      "account_suspended",
      "The sender's account is suspended, so nothing can be signed right now.",
    );
  }
}

/**
 * Locks the request and the signer, re-reads them and checks the signer may act now. Everything
 * that changes a signer or its request goes through here, so two tabs can't both sign.
 */
async function lockForAction(
  tx: Transaction,
  access: SignSessionAccess,
  now: Date,
): Promise<Loaded> {
  const { session } = access;
  await tx
    .select({ id: signRequest.id })
    .from(signRequest)
    .where(
      and(
        eq(signRequest.id, session.requestId),
        eq(signRequest.organizationId, session.organizationId),
      ),
    )
    .for("update");
  const loaded = await load(tx, access);
  checkSignable(loaded.request, now);
  checkSignerOpen(loaded.signer);
  return loaded;
}

/** The signing page's data. Records `viewed` the first time the signer opens a sent request. */
export async function openSigning(
  access: SignSessionAccess,
  opts: { actor: SignActor; now?: Date },
): Promise<SigningView> {
  const now = opts.now ?? new Date();
  const { session } = access;
  let loaded = await load(db, access);
  const firstView =
    (loaded.signer.status === "pending" || loaded.signer.status === "notified") &&
    isOpen(loaded, now);
  if (firstView) {
    await db.transaction(async (tx) => {
      const locked = await lockForAction(tx, access, now);
      if (locked.signer.status !== "pending" && locked.signer.status !== "notified") return;
      const [signer] = await tx
        .update(signSigner)
        .set({ status: "viewed", viewedAt: now })
        .where(
          and(
            eq(signSigner.id, locked.signer.id),
            eq(signSigner.organizationId, session.organizationId),
          ),
        )
        .returning();
      await recordSignEvent(
        tx,
        { request: locked.request, signer: signer ?? locked.signer, sandbox: access.sandbox },
        {
          type: "viewed",
          actor: opts.actor,
          details: { document_sha256: documentHashes(locked), session_id: session.id },
          occurredAt: now,
        },
      );
    });
    loaded = await load(db, access);
  }
  const settings = await getSignSettings(session);
  const name = await requesterName({ organizationId: session.organizationId, settings });
  const { request, signer } = loaded;
  return {
    request: {
      id: request.id,
      title: request.title,
      message: request.message,
      status: request.status,
      signing_order: request.signingOrder,
      expires_at: request.expiresAt?.toISOString() ?? null,
    },
    signer: {
      id: signer.id,
      name: signer.name,
      email: signer.email,
      status: signer.status,
      consented: signer.consentedAt !== null,
      signed_at: signer.signedAt?.toISOString() ?? null,
      declined_at: signer.declinedAt?.toISOString() ?? null,
    },
    requester: { name },
    branding: { accent_color: settings.accentColor, theme: settings.theme },
    disclosure: signDisclosure(settings, name),
    documents: loaded.documents.map((document) => ({
      id: document.id,
      filename: document.filename,
      pages: document.pages,
    })),
    fields: loaded.fields.map((field) => ({
      id: field.id,
      document_id: field.documentId,
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required,
      label: field.label,
    })),
    waiting_for: waitingFor(loaded).map((other) => ({ name: other.name })),
    can_sign: canSign(loaded, access, now),
    read_only: access.readOnly,
    sandbox: access.sandbox,
  };
}

/**
 * The signer agrees to sign electronically, to the text the page showed (`disclosureSha256`; if
 * the environment's text changed since, they must read the new one). Repeating it does nothing.
 */
export async function consentToSign(
  access: SignSessionAccess,
  input: { disclosureSha256: string; actor: SignActor; now?: Date },
): Promise<void> {
  writable(access);
  const now = input.now ?? new Date();
  const { session } = access;
  const settings = await getSignSettings(session);
  const name = await requesterName({ organizationId: session.organizationId, settings });
  const disclosure = signDisclosure(settings, name);
  if (disclosure.sha256 !== input.disclosureSha256) {
    throw new SignError(
      "invalid_signing",
      "The consent text has changed. Reload the page and read it again.",
      { param: "disclosure_sha256" },
    );
  }
  await db.transaction(async (tx) => {
    const loaded = await lockForAction(tx, access, now);
    if (loaded.signer.consentedAt) return;
    const [signer] = await tx
      .update(signSigner)
      .set({ consentedAt: now })
      .where(
        and(
          eq(signSigner.id, loaded.signer.id),
          eq(signSigner.organizationId, session.organizationId),
        ),
      )
      .returning();
    await recordSignEvent(
      tx,
      { request: loaded.request, signer: signer ?? loaded.signer, sandbox: access.sandbox },
      {
        type: "consented",
        actor: input.actor,
        details: { disclosure_sha256: disclosure.sha256, session_id: session.id },
        occurredAt: now,
      },
    );
  });
}

/** A document of the request, once the signer has consented. */
export async function readSigningDocument(
  access: SignSessionAccess,
  input: { documentId: string; store: DocumentStore },
): Promise<{ filename: string; content: Uint8Array }> {
  const loaded = await load(db, access);
  if (!loaded.signer.consentedAt) {
    throw new SignError(
      "consent_required",
      "Agree to sign electronically before opening the documents.",
    );
  }
  const document = loaded.documents.find((candidate) => candidate.id === input.documentId);
  if (!document) throw new SignError("not_found", "No such document in this signature request.");
  const [row] = await db
    .select({ storeKey: signDocument.storeKey })
    .from(signDocument)
    .where(
      and(
        eq(signDocument.id, document.id),
        eq(signDocument.organizationId, loaded.request.organizationId),
      ),
    )
    .limit(1);
  const content = row ? await input.store.get(row.storeKey) : null;
  if (!content) throw new Error(`Document ${document.id} has no bytes in the store.`);
  return { filename: document.filename, content };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Decodes a base64 PNG (a `data:image/png;base64,` URL or bare base64) and checks its header. */
export function decodeSignatureImage(value: string, param: string): Buffer {
  const base64 = value.startsWith("data:image/png;base64,")
    ? value.slice("data:image/png;base64,".length)
    : value;
  const bytes = Buffer.from(base64, "base64");
  const invalid = (message: string) => new SignError("invalid_signing", message, { param });
  if (bytes.length === 0 || bytes.length > MAX_SIGNATURE_IMAGE_BYTES) {
    throw invalid(`The image must be a PNG of at most ${MAX_SIGNATURE_IMAGE_BYTES / 1024} KB.`);
  }
  // The signature, then the IHDR chunk (length 13): width and height, big-endian.
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.toString("latin1", 12, 16) !== "IHDR") {
    throw invalid("The image must be a PNG.");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (
    width === 0 ||
    height === 0 ||
    width > MAX_SIGNATURE_IMAGE_SIDE ||
    height > MAX_SIGNATURE_IMAGE_SIDE
  ) {
    throw invalid(`The image must be 1-${MAX_SIGNATURE_IMAGE_SIDE} pixels on each side.`);
  }
  return bytes;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * `orgs/<org>/<env>/signatures/<signer id>-<kind>-<sha256>.png`: an adopted signature or initials,
 * by content, so an attempt that loses (rejected, or racing another tab) never overwrites the image
 * the committed signature names.
 */
export function signatureImageKey(input: {
  organizationId: string;
  environmentId: string;
  signerId: string;
  kind: "signature" | "initials";
  sha256: string;
}): string {
  return `${organizationPrefix(input.organizationId)}${input.environmentId}/signatures/${input.signerId}-${input.kind}-${input.sha256}.png`;
}

export type SignInput = {
  /** Values of the signer's `text` (a string) and `checkbox` (a boolean) fields, by field id. */
  values: Record<string, string | boolean>;
  /** The adopted signature: a PNG, base64 (or a `data:` URL). */
  signature: string;
  /** The adopted initials, when the signer has `initials` fields. */
  initials?: string | null;
};

/** The value each of the signer's fields gets, or why the input can't be signed. */
function fieldValues(
  loaded: Loaded,
  input: SignInput,
  images: { signature: string; initials: string | null },
  now: Date,
): Map<string, string | null> {
  const invalid = (message: string, param: string) =>
    new SignError("invalid_signing", message, { param });
  const own = new Set(loaded.fields.map((field) => field.id));
  for (const id of Object.keys(input.values)) {
    if (!own.has(id)) throw invalid(`${id} isn't one of your fields.`, `values.${id}`);
  }
  const values = new Map<string, string | null>();
  for (const field of loaded.fields) {
    const given = input.values[field.id];
    const param = `values.${field.id}`;
    switch (field.type) {
      case "signature":
        values.set(field.id, images.signature);
        break;
      case "initials":
        if (!images.initials) {
          if (field.required) throw invalid("Adopt your initials first.", "initials");
          values.set(field.id, null);
          break;
        }
        values.set(field.id, images.initials);
        break;
      case "date_signed":
        values.set(field.id, now.toISOString().slice(0, 10));
        break;
      case "name":
        values.set(field.id, loaded.signer.name);
        break;
      case "email":
        values.set(field.id, loaded.signer.email);
        break;
      case "text": {
        if (given !== undefined && typeof given !== "string") {
          throw invalid("A text field takes a string.", param);
        }
        const text = given?.trim() ?? "";
        if (text.length > MAX_TEXT_FIELD_LENGTH) {
          throw invalid(`At most ${MAX_TEXT_FIELD_LENGTH} characters.`, param);
        }
        if (field.required && text === "") {
          throw invalid(`Fill in ${field.label ?? "every required field"}.`, param);
        }
        values.set(field.id, text === "" ? null : text);
        break;
      }
      case "checkbox": {
        if (given !== undefined && typeof given !== "boolean") {
          throw invalid("A checkbox takes true or false.", param);
        }
        if (field.required && given !== true) {
          throw invalid(`Check ${field.label ?? "every required box"}.`, param);
        }
        values.set(field.id, given === true ? "true" : "false");
        break;
      }
    }
  }
  return values;
}

/**
 * The signer signs: their field values and adopted signature are stored and can't change after
 * this. When they were the last signer, the request is completed.
 */
export async function signAsSigner(
  access: SignSessionAccess,
  input: SignInput & { actor: SignActor; store: DocumentStore; now?: Date },
): Promise<void> {
  writable(access);
  const now = input.now ?? new Date();
  const { session } = access;
  const signature = decodeSignatureImage(input.signature, "signature");
  const initials = input.initials ? decodeSignatureImage(input.initials, "initials") : null;
  // Check everything that doesn't need a lock before writing any bytes.
  const preview = await load(db, access);
  if (!preview.signer.consentedAt) {
    throw new SignError("consent_required", "Agree to sign electronically first.");
  }
  const imageHashes = {
    signature: sha256(signature),
    initials: initials ? sha256(initials) : null,
  };
  fieldValues(preview, input, imageHashes, now);

  const scope = {
    organizationId: session.organizationId,
    environmentId: session.environmentId,
    signerId: session.signerId,
  };
  const keys = {
    signature: signatureImageKey({ ...scope, kind: "signature", sha256: imageHashes.signature }),
    initials: imageHashes.initials
      ? signatureImageKey({ ...scope, kind: "initials", sha256: imageHashes.initials })
      : null,
  };
  // Written before the transaction, under keys of their own content; an attempt that fails removes
  // what it wrote unless the committed signature names the same image.
  await input.store.put({
    key: keys.signature,
    organizationId: session.organizationId,
    contentType: "image/png",
    content: signature,
  });
  if (initials && keys.initials) {
    await input.store.put({
      key: keys.initials,
      organizationId: session.organizationId,
      contentType: "image/png",
      content: initials,
    });
  }

  try {
    await commitSignature(access, input, { keys, imageHashes, now });
  } catch (error) {
    await discardImages(input.store, access, keys);
    throw error;
  }
}

/** Removes images an attempt wrote that the signer's committed signature doesn't name. */
async function discardImages(
  store: DocumentStore,
  access: SignSessionAccess,
  keys: { signature: string; initials: string | null },
): Promise<void> {
  const { session } = access;
  const [committed] = await db
    .select({ signatureKey: signSigner.signatureKey, initialsKey: signSigner.initialsKey })
    .from(signSigner)
    .where(
      and(
        eq(signSigner.id, session.signerId),
        eq(signSigner.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  const kept = new Set([committed?.signatureKey, committed?.initialsKey]);
  const orphans = [keys.signature, keys.initials].filter(
    (key): key is string => key !== null && !kept.has(key),
  );
  await store.delete(orphans).catch((error) => {
    console.error("[sign] could not delete an unused signature image:", error);
  });
}

async function commitSignature(
  access: SignSessionAccess,
  input: SignInput & { actor: SignActor },
  attempt: {
    keys: { signature: string; initials: string | null };
    imageHashes: { signature: string; initials: string | null };
    now: Date;
  },
): Promise<void> {
  const { session } = access;
  const { keys, imageHashes, now } = attempt;
  await db.transaction(async (tx) => {
    const loaded = await lockForAction(tx, access, now);
    if (!loaded.signer.consentedAt) {
      throw new SignError("consent_required", "Agree to sign electronically first.");
    }
    if (waitingFor(loaded).length > 0) {
      throw new SignError(
        "not_signers_turn",
        `${waitingFor(loaded)
          .map((other) => other.name)
          .join(", ")} must sign first.`,
      );
    }
    const values = fieldValues(loaded, input, imageHashes, now);
    for (const [id, value] of values) {
      await tx
        .update(signField)
        .set({ value })
        .where(and(eq(signField.id, id), eq(signField.organizationId, session.organizationId)));
    }
    const [signer] = await tx
      .update(signSigner)
      .set({
        status: "signed",
        signedAt: now,
        signatureKey: keys.signature,
        signatureSha256: imageHashes.signature,
        initialsKey: keys.initials,
        initialsSha256: imageHashes.initials,
      })
      .where(
        and(
          eq(signSigner.id, loaded.signer.id),
          eq(signSigner.organizationId, session.organizationId),
        ),
      )
      .returning();
    const remaining = loaded.signers.filter(
      (other) => other.id !== loaded.signer.id && other.status !== "signed",
    );
    let request = loaded.request;
    if (remaining.length === 0) {
      const [completed] = await tx
        .update(signRequest)
        .set({ status: "completed", completedAt: now })
        .where(
          and(
            eq(signRequest.id, request.id),
            eq(signRequest.organizationId, request.organizationId),
          ),
        )
        .returning();
      request = completed ?? request;
    }
    const context = { request, signer: signer ?? loaded.signer, sandbox: access.sandbox };
    await recordSignEvent(tx, context, {
      type: "signed",
      actor: input.actor,
      details: {
        field_ids: [...values.keys()],
        document_sha256: documentHashes(loaded),
        signature_sha256: imageHashes.signature,
        ...(imageHashes.initials ? { initials_sha256: imageHashes.initials } : {}),
        session_id: session.id,
      },
      occurredAt: now,
    });
    if (remaining.length === 0) {
      await recordSignEvent(
        tx,
        { request, sandbox: access.sandbox },
        {
          type: "completed",
          actor: { kind: "system" },
          details: { document_sha256: documentHashes(loaded) },
          occurredAt: now,
        },
      );
    }
  });
}

/** The signer declines (which also withdraws their consent): the whole request is declined. */
export async function declineAsSigner(
  access: SignSessionAccess,
  input: { reason?: string | null; actor: SignActor; now?: Date },
): Promise<void> {
  writable(access);
  const now = input.now ?? new Date();
  const { session } = access;
  const reason = input.reason?.trim().slice(0, MAX_DECLINE_REASON_LENGTH) || null;
  await db.transaction(async (tx) => {
    const loaded = await lockForAction(tx, access, now);
    const [signer] = await tx
      .update(signSigner)
      .set({ status: "declined", declinedAt: now, declineReason: reason })
      .where(
        and(
          eq(signSigner.id, loaded.signer.id),
          eq(signSigner.organizationId, session.organizationId),
        ),
      )
      .returning();
    const [request] = await tx
      .update(signRequest)
      .set({ status: "declined", declinedAt: now })
      .where(
        and(
          eq(signRequest.id, loaded.request.id),
          eq(signRequest.organizationId, session.organizationId),
        ),
      )
      .returning();
    await recordSignEvent(
      tx,
      {
        request: request ?? loaded.request,
        signer: signer ?? loaded.signer,
        sandbox: access.sandbox,
      },
      {
        type: "declined",
        actor: input.actor,
        details: { ...(reason ? { reason } : {}), session_id: session.id },
        occurredAt: now,
      },
    );
  });
}
