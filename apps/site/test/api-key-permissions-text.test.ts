import { expect, test } from "bun:test";
import { API_KEY_RESOURCES } from "@coss/auth/api-key-permissions";
import { renderApiKeyComponents } from "../src/lib/api-key-permissions-text";

test("renders the permission table as Markdown", () => {
  const text = renderApiKeyComponents("Permissions:\n\n<ApiKeyPermissionsTable />");
  const rows = text.split("\n").filter((line) => line.startsWith("| "));
  expect(rows).toHaveLength(API_KEY_RESOURCES.length + 2);
  expect(text).toContain("| Emails | `email:send`, `email:read` |");
  expect(text).not.toContain("<ApiKeyPermissionsTable />");
});
