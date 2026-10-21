import type { ContentStorageResponse, MobileTemplateSummary } from "@coss/companion";
import type { Tone } from "./theme";

/**
 * A template's published version and whether its draft changed since: the dashboard's
 * TemplateStatus (apps/web/src/app/[orgSlug]/projects/[projectSlug]/[envSlug]/templates/template-status.tsx).
 */
export function templateStatuses(
  template: Pick<MobileTemplateSummary, "published_version" | "has_unpublished_changes">,
): { label: string; tone: Tone }[] {
  if (template.published_version === null) return [{ label: "Draft only", tone: "neutral" }];
  return [
    { label: `Published v${template.published_version}`, tone: "success" },
    ...(template.has_unpublished_changes
      ? [{ label: "Unpublished changes", tone: "warning" as const }]
      : []),
  ];
}

/** The template's status as one dot: a warning while the draft has unpublished changes. */
export function templateTone(
  template: Pick<MobileTemplateSummary, "published_version" | "has_unpublished_changes">,
): Tone {
  const statuses = templateStatuses(template);
  return statuses[statuses.length - 1]?.tone ?? "neutral";
}

/**
 * The content storage options, from the dashboard's StorageSettingsForm
 * (apps/web/src/app/[orgSlug]/projects/[projectSlug]/[envSlug]/content-storage/storage-form.tsx).
 */
export const CONTENT_STORAGE_OPTIONS: {
  value: ContentStorageResponse["content_storage"];
  label: string;
  description: string;
}[] = [
  {
    value: "store",
    label: "Store content",
    description:
      "Keep each email's subject, body, headers and attachment names for the email retention period, to read back here and through the API.",
  },
  {
    value: "discard",
    label: "Discard content once sent",
    description:
      "Keep them only until the email is sent, fails or is canceled. Addresses, tags, statuses and events are kept as usual.",
  },
];
