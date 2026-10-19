import { API_KEY_RESOURCES } from "@coss/auth/api-key-permissions";
import { API_KEY_PERMISSIONS } from "@coss/auth/constants";

/** `<ApiKeyPermissionsTable />` (`src/components/api-key-permissions.tsx`) as Markdown, for /llms*.txt. */
export function renderApiKeyComponents(markdown: string): string {
  const table = [
    "| Resource | Permissions | Covers |",
    "| --- | --- | --- |",
    ...API_KEY_RESOURCES.map((info) => {
      const permissions = (API_KEY_PERMISSIONS[info.resource] ?? [])
        .map((action) => `\`${info.resource}:${action}\``)
        .join(", ");
      return `| ${info.label} | ${permissions} | ${info.description} |`;
    }),
  ].join("\n");
  return markdown.replaceAll("<ApiKeyPermissionsTable />", table);
}
