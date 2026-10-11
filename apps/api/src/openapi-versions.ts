/**
 * Documents `Coss-Version` on every `/v1` operation of the generated OpenAPI document: a shared header
 * parameter, the response header on successes, and `invalid_api_version` among the 400s.
 */
import { API_VERSION_HEADER, type Versioning } from "@coss/versioning";
import { requestIdHeader } from "./routes/docs.ts";

type Responses = Record<
  string,
  { description?: string; headers?: Record<string, unknown>; content?: unknown; $ref?: string }
>;
type Operation = { parameters?: unknown[]; responses?: Responses };
type Document = {
  info: { version: string };
  paths?: Record<string, Record<string, unknown>>;
  components?: { parameters?: Record<string, unknown> };
};

const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
const PARAMETER_NAME = "CossVersion";
const INVALID_VERSION = `The \`${API_VERSION_HEADER}\` header names an unknown API version (\`invalid_api_version\`).`;
const ALSO_INVALID_VERSION = `Also when the \`${API_VERSION_HEADER}\` header names an unknown API version (\`invalid_api_version\`).`;

export function withApiVersionDocs<T extends object>(document: T, versioning: Versioning): T {
  const doc = document as unknown as Document;
  doc.info.version = versioning.latest;
  doc.components = {
    ...doc.components,
    parameters: {
      ...doc.components?.parameters,
      [PARAMETER_NAME]: {
        in: "header",
        name: API_VERSION_HEADER,
        required: false,
        description:
          "The API version (a date) to use for this request. Defaults to your organization's version, " +
          "pinned to the latest one when it first used the API and upgraded from the dashboard. The SDK " +
          "always sends the version it was built for.",
        schema: { type: "string", enum: [...versioning.versions], examples: [versioning.latest] },
      },
    },
  };
  const responseHeader = {
    description: "The API version this response is rendered in.",
    schema: { type: "string", examples: [versioning.latest] },
  };

  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (!path.startsWith("/v1/")) continue;
    for (const method of METHODS) {
      const operation = item[method] as Operation | undefined;
      if (!operation) continue;
      operation.parameters = [
        ...(operation.parameters ?? []),
        { $ref: `#/components/parameters/${PARAMETER_NAME}` },
      ];
      const responses: Responses = { ...operation.responses };
      for (const [status, response] of Object.entries(responses)) {
        if (status.startsWith("2") && !response.$ref) {
          response.headers = { ...response.headers, [API_VERSION_HEADER]: responseHeader };
        }
      }
      const badRequest = responses["400"];
      responses["400"] = badRequest
        ? {
            ...badRequest,
            description: `${badRequest.description ?? ""} ${ALSO_INVALID_VERSION}`.trim(),
          }
        : {
            description: INVALID_VERSION,
            headers: { "X-Request-Id": requestIdHeader },
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          };
      operation.responses = Object.fromEntries(
        Object.entries(responses).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
  }
  return document;
}
