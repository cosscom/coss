"use client";

import type { SignTemplateObjectOutput } from "@coss/sign/schemas";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Spinner } from "@coss/ui/components/spinner";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PdfPages } from "@/components/pdf-pages";
import { postToHost, reportHeight } from "@/lib/embed";

type FieldType = "signature" | "initials" | "date_signed" | "name" | "email" | "text" | "checkbox";
type Role = { key: string; name: string };
type DraftField = {
  id: string;
  role: string;
  type: FieldType;
  document: number;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label: string | null;
  merge_key: string | null;
};
type Overview = {
  template: SignTemplateObjectOutput;
  read_only: boolean;
  sandbox: boolean;
  branding: { accent_color: string | null; theme: "system" | "light" | "dark" };
};
type Draft = {
  name: string;
  title: string;
  message: string;
  signing_order: "parallel" | "sequential";
  documents: string[];
  roles: Role[];
  fields: DraftField[];
};

const FIELD_TYPES: { type: FieldType; label: string; size: [number, number] }[] = [
  { type: "signature", label: "Signature", size: [160, 40] },
  { type: "initials", label: "Initials", size: [60, 30] },
  { type: "date_signed", label: "Date signed", size: [110, 18] },
  { type: "name", label: "Name", size: [160, 18] },
  { type: "email", label: "Email", size: [180, 18] },
  { type: "text", label: "Text", size: [160, 18] },
  { type: "checkbox", label: "Checkbox", size: [14, 14] },
];
const ROLE_COLORS = ["#2563eb", "#db2777", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

function roleKey(name: string, taken: readonly string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "signer";
  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`;
  return key;
}

function readToken(sessionId: string): string | null {
  const key = `coss-sign-builder:${sessionId}`;
  const fromHash = window.location.hash.slice(1);
  if (fromHash.startsWith("cossb_")) {
    try {
      sessionStorage.setItem(key, fromHash);
    } catch {
      return fromHash;
    }
    window.history.replaceState(null, "", window.location.pathname);
    return fromHash;
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function toDraft(template: SignTemplateObjectOutput): Draft {
  return {
    name: template.name,
    title: template.title ?? "",
    message: template.message ?? "",
    signing_order: template.signing_order,
    documents: template.documents.map((document) => document.id),
    roles: template.roles,
    fields: template.fields.map((field) => ({
      id: field.id,
      role: field.role,
      type: field.type,
      document: template.documents.findIndex((document) => document.id === field.document_id),
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required,
      label: field.label,
      merge_key: field.merge_key,
    })),
  };
}

let localIds = 0;

export function Builder({ sessionId }: { sessionId: string }) {
  const token = useRef<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<Record<string, ArrayBuffer>>({});
  const [placing, setPlacing] = useState<FieldType | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const call = useCallback(
    async (path: string, init?: { method?: string; body?: unknown }) => {
      if (token.current === null) token.current = readToken(sessionId);
      const response = await fetch(`/api/builder/${sessionId}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token.current ?? ""}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { code: string; message: string };
        } | null;
        throw new Error(payload?.error?.message ?? "Something went wrong.");
      }
      return response;
    },
    [sessionId],
  );

  const load = useCallback((next: Overview) => {
    setOverview(next);
    setDraft(toDraft(next.template));
    setDirty(false);
    setRole((current) => current ?? next.template.roles[0]?.key ?? null);
  }, []);

  useEffect(() => reportHeight(), []);

  useEffect(() => {
    call("")
      .then((response) => response.json() as Promise<Overview>)
      .then((next) => {
        load(next);
        postToHost({ type: "builder_ready", template_id: next.template.id });
      })
      .catch((caught: unknown) => {
        const message = caught instanceof Error ? caught.message : "This link can't be used.";
        setFailure(message);
        postToHost({ type: "error", code: "not_found", message });
      });
  }, [call, load]);

  // Fetch the bytes of documents not loaded yet, each once (a download in flight isn't restarted).
  const fetching = useRef(new Set<string>());
  useEffect(() => {
    if (!overview) return;
    for (const document of overview.template.documents) {
      if (files[document.id] || fetching.current.has(document.id)) continue;
      fetching.current.add(document.id);
      call(`/documents/${document.id}`)
        .then((response) => response.arrayBuffer())
        .then((bytes) => setFiles((current) => ({ ...current, [document.id]: bytes })))
        .catch(() => setError(`Couldn't load ${document.filename}.`))
        .finally(() => fetching.current.delete(document.id));
    }
  }, [overview, files, call]);

  useEffect(() => {
    if (!overview) return;
    const { theme, accent_color } = overview.branding;
    const dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    if (accent_color) document.documentElement.style.setProperty("--primary", accent_color);
  }, [overview]);

  const change = (update: (current: Draft) => Draft) => {
    setDraft((current) => (current ? update(current) : current));
    setDirty(true);
  };

  if (failure) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-2 p-6 text-center">
        <h1 className="font-semibold text-xl">This link can't be used</h1>
        <p className="text-muted-foreground text-sm">{failure}</p>
      </main>
    );
  }
  if (!overview || !draft) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const readOnly = overview.read_only;
  const color = (key: string) =>
    ROLE_COLORS[
      Math.max(
        0,
        draft.roles.findIndex((candidate) => candidate.key === key),
      ) % ROLE_COLORS.length
    ] ?? ROLE_COLORS[0];
  const selectedField = draft.fields.find((field) => field.id === selected) ?? null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await call("", {
        method: "PUT",
        body: {
          name: draft.name,
          title: draft.title || null,
          message: draft.message || null,
          signing_order: draft.signing_order,
          documents: draft.documents,
          roles: draft.roles,
          fields: draft.fields
            .filter((field) => field.document >= 0)
            .map(({ id: _id, ...field }) => field),
        },
      });
      const next = (await response.json()) as Overview;
      load(next);
      setSelected(null);
      postToHost({ type: "saved", template_id: next.template.id, ready: next.template.ready });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (dirty) {
      setError("Save your changes before adding a document.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      }
      const response = await call("/documents", {
        method: "POST",
        body: {
          filename: file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`,
          content: btoa(binary),
        },
      });
      load((await response.json()) as Overview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't add that file.");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index: number) =>
    change((current) => ({
      ...current,
      documents: current.documents.filter((_, position) => position !== index),
      fields: current.fields
        .filter((field) => field.document !== index)
        .map((field) =>
          field.document > index ? { ...field, document: field.document - 1 } : field,
        ),
    }));

  const addRole = () =>
    change((current) => {
      const name = `Signer ${current.roles.length + 1}`;
      const key = roleKey(
        name,
        current.roles.map((candidate) => candidate.key),
      );
      setRole(key);
      return { ...current, roles: [...current.roles, { key, name }] };
    });

  const place = (
    document: number,
    page: number,
    x: number,
    y: number,
    size: { width: number; height: number },
  ) => {
    if (!placing || !role) return;
    const spec = FIELD_TYPES.find((candidate) => candidate.type === placing);
    const [width, height] = spec?.size ?? [120, 20];
    const field: DraftField = {
      id: `new_${++localIds}`,
      role,
      type: placing,
      document,
      page,
      x: Math.max(0, Math.min(x, size.width - width)),
      y: Math.max(0, Math.min(y, size.height - height)),
      width,
      height,
      required: placing !== "checkbox",
      label: null,
      merge_key: null,
    };
    change((current) => ({ ...current, fields: [...current.fields, field] }));
    setSelected(field.id);
    setPlacing(null);
  };

  const updateField = (id: string, patch: Partial<DraftField>) =>
    change((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));

  const documentsById = new Map(
    overview.template.documents.map((document) => [document.id, document]),
  );

  return (
    <div className="flex min-h-[80vh] flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Input
          aria-label="Template name"
          className="max-w-xs"
          disabled={readOnly}
          onChange={(event) => change((current) => ({ ...current, name: event.target.value }))}
          value={draft.name}
        />
        {overview.template.ready && !dirty ? (
          <Badge variant="success">Ready to use</Badge>
        ) : (
          <Badge variant="outline">{dirty ? "Unsaved changes" : "Not ready"}</Badge>
        )}
        {overview.sandbox && <Badge variant="warning">Sandbox</Badge>}
        <div className="ms-auto flex items-center gap-2">
          {error && <span className="text-destructive-foreground text-sm">{error}</span>}
          <Button disabled={readOnly || !dirty} loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-64">
          <section className="flex flex-col gap-2">
            <h2 className="font-medium text-sm">Signers</h2>
            {draft.roles.map((item) => (
              <div className="flex items-center gap-2" key={item.key}>
                <button
                  aria-label={`Place fields for ${item.name}`}
                  aria-pressed={role === item.key}
                  className={`size-4 shrink-0 rounded-full ring-offset-2 ${role === item.key ? "ring-2 ring-ring" : ""}`}
                  onClick={() => setRole(item.key)}
                  style={{ background: color(item.key) }}
                  type="button"
                />
                <Input
                  aria-label="Signer role name"
                  disabled={readOnly}
                  onChange={(event) =>
                    change((current) => ({
                      ...current,
                      roles: current.roles.map((candidate) =>
                        candidate.key === item.key
                          ? { ...candidate, name: event.target.value }
                          : candidate,
                      ),
                    }))
                  }
                  size="sm"
                  value={item.name}
                />
                <Button
                  aria-label={`Remove ${item.name}`}
                  disabled={readOnly}
                  onClick={() =>
                    change((current) => ({
                      ...current,
                      roles: current.roles.filter((candidate) => candidate.key !== item.key),
                      fields: current.fields.filter((field) => field.role !== item.key),
                    }))
                  }
                  size="icon-sm"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              disabled={readOnly || draft.roles.length >= 20}
              onClick={addRole}
              size="sm"
              variant="outline"
            >
              Add signer
            </Button>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-medium text-sm">Fields</h2>
            <p className="text-muted-foreground text-xs">
              {role
                ? placing
                  ? "Click on a page to place it."
                  : "Pick a field, then click on a page."
                : "Add a signer first."}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_TYPES.map((spec) => (
                <Button
                  aria-pressed={placing === spec.type}
                  disabled={readOnly || !role || draft.documents.length === 0}
                  key={spec.type}
                  onClick={() => setPlacing(placing === spec.type ? null : spec.type)}
                  size="sm"
                  variant={placing === spec.type ? "default" : "outline"}
                >
                  {spec.label}
                </Button>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-medium text-sm">Documents</h2>
            {draft.documents.map((id, index) => (
              <div className="flex items-center gap-2 text-sm" key={id}>
                <span className="min-w-0 flex-1 truncate">
                  {documentsById.get(id)?.filename ?? id}
                </span>
                <Button
                  aria-label="Remove document"
                  disabled={readOnly}
                  onClick={() => removeDocument(index)}
                  size="icon-sm"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            ))}
            <Label className="cursor-pointer">
              <span className="inline-flex h-8 items-center rounded-lg border px-3 text-sm">
                {uploading ? "Adding…" : "Add PDF"}
              </span>
              <input
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={readOnly || uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(file);
                }}
                type="file"
              />
            </Label>
          </section>
          {selectedField && (
            <FieldPanel
              disabled={readOnly}
              field={selectedField}
              onChange={(patch) => updateField(selectedField.id, patch)}
              onRemove={() => {
                change((current) => ({
                  ...current,
                  fields: current.fields.filter((field) => field.id !== selectedField.id),
                }));
                setSelected(null);
              }}
              roles={draft.roles}
            />
          )}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {draft.documents.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
              Add a PDF to start.
            </div>
          )}
          {draft.documents.map((id, documentIndex) => {
            const bytes = files[id];
            const pages = documentsById.get(id)?.pages ?? [];
            return (
              <section className="flex flex-col gap-2" key={id}>
                {draft.documents.length > 1 && (
                  <h2 className="font-medium text-sm">{documentsById.get(id)?.filename}</h2>
                )}
                {bytes ? (
                  <PdfPages
                    bytes={bytes}
                    overlay={(page, scale) => (
                      <PageOverlay
                        color={color}
                        disabled={readOnly}
                        fields={draft.fields.filter(
                          (field) => field.document === documentIndex && field.page === page,
                        )}
                        onMove={(fieldId, patch) => updateField(fieldId, patch)}
                        onPlace={(x, y) =>
                          place(
                            documentIndex,
                            page,
                            x,
                            y,
                            pages[page - 1] ?? { width: 612, height: 792 },
                          )
                        }
                        onSelect={setSelected}
                        pageSize={pages[page - 1] ?? { width: 612, height: 792 }}
                        placing={placing !== null}
                        scale={scale}
                        selected={selected}
                      />
                    )}
                    pages={pages}
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-md border">
                    <Spinner />
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}

function PageOverlay({
  fields,
  scale,
  pageSize,
  placing,
  selected,
  disabled,
  color,
  onPlace,
  onSelect,
  onMove,
}: {
  fields: DraftField[];
  scale: number;
  pageSize: { width: number; height: number };
  placing: boolean;
  selected: string | null;
  disabled: boolean;
  color: (role: string) => string | undefined;
  onPlace: (x: number, y: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, patch: Partial<DraftField>) => void;
}) {
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    field: DraftField;
  } | null>(null);

  const begin = (event: ReactPointerEvent, field: DraftField, mode: "move" | "resize") => {
    if (disabled) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: field.id, mode, startX: event.clientX, startY: event.clientY, field };
    onSelect(field.id);
  };
  const move = (event: ReactPointerEvent) => {
    const current = drag.current;
    if (!current) return;
    const dx = (event.clientX - current.startX) / scale;
    const dy = (event.clientY - current.startY) / scale;
    const { field } = current;
    if (current.mode === "move") {
      onMove(current.id, {
        x: Math.max(0, Math.min(field.x + dx, pageSize.width - field.width)),
        y: Math.max(0, Math.min(field.y + dy, pageSize.height - field.height)),
      });
    } else {
      onMove(current.id, {
        width: Math.max(8, Math.min(field.width + dx, pageSize.width - field.x)),
        height: Math.max(8, Math.min(field.height + dy, pageSize.height - field.y)),
      });
    }
  };
  const end = () => {
    drag.current = null;
  };

  return (
    <div
      className={`absolute inset-0 ${placing ? "cursor-crosshair" : ""}`}
      onPointerDown={(event) => {
        if (!placing) {
          onSelect(null);
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        onPlace((event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale);
      }}
    >
      {fields.map((field) => {
        const tint = color(field.role) ?? "#2563eb";
        return (
          <div
            className="absolute flex select-none items-center justify-center overflow-hidden rounded-sm border-2 text-[10px] text-gray-900"
            key={field.id}
            onPointerCancel={end}
            onPointerDown={(event) => begin(event, field, "move")}
            onPointerMove={move}
            onPointerUp={end}
            style={{
              left: field.x * scale,
              top: field.y * scale,
              width: field.width * scale,
              height: field.height * scale,
              borderColor: tint,
              background: `${tint}22`,
              cursor: disabled ? "default" : "move",
              outline: selected === field.id ? `2px solid ${tint}` : undefined,
              outlineOffset: 2,
            }}
          >
            <span className="truncate px-0.5">{field.label ?? field.type.replace("_", " ")}</span>
            {selected === field.id && !disabled && (
              <span
                aria-hidden
                className="absolute right-0 bottom-0 size-2.5 cursor-se-resize"
                onPointerDown={(event) => begin(event, field, "resize")}
                onPointerMove={move}
                onPointerUp={end}
                style={{ background: tint }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldPanel({
  field,
  roles,
  disabled,
  onChange,
  onRemove,
}: {
  field: DraftField;
  roles: Role[];
  disabled: boolean;
  onChange: (patch: Partial<DraftField>) => void;
  onRemove: () => void;
}) {
  const select = "h-8 w-full rounded-lg border bg-background px-2 text-sm disabled:opacity-60";
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-3">
      <h2 className="font-medium text-sm">Field</h2>
      <Label className="flex flex-col items-start gap-1 text-xs">
        Type
        <select
          className={select}
          disabled={disabled}
          onChange={(event) => onChange({ type: event.target.value as FieldType })}
          value={field.type}
        >
          {FIELD_TYPES.map((spec) => (
            <option key={spec.type} value={spec.type}>
              {spec.label}
            </option>
          ))}
        </select>
      </Label>
      <Label className="flex flex-col items-start gap-1 text-xs">
        Signer
        <select
          className={select}
          disabled={disabled}
          onChange={(event) => onChange({ role: event.target.value })}
          value={field.role}
        >
          {roles.map((role) => (
            <option key={role.key} value={role.key}>
              {role.name}
            </option>
          ))}
        </select>
      </Label>
      <Label className="flex flex-col items-start gap-1 text-xs">
        Label
        <Input
          disabled={disabled}
          maxLength={100}
          onChange={(event) => onChange({ label: event.target.value || null })}
          size="sm"
          value={field.label ?? ""}
        />
      </Label>
      {field.type === "text" && (
        <Label className="flex flex-col items-start gap-1 text-xs">
          Merge field key (filled when a request is made)
          <Input
            disabled={disabled}
            maxLength={64}
            onChange={(event) =>
              onChange({ merge_key: event.target.value.replace(/[^A-Za-z0-9_]/g, "") || null })
            }
            size="sm"
            value={field.merge_key ?? ""}
          />
        </Label>
      )}
      <Label className="flex items-center gap-2 text-xs">
        <input
          checked={field.required}
          disabled={disabled}
          onChange={(event) => onChange({ required: event.target.checked })}
          type="checkbox"
        />
        Required
      </Label>
      <Button disabled={disabled} onClick={onRemove} size="sm" variant="destructive-outline">
        Remove field
      </Button>
    </section>
  );
}
