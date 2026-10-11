import {
  createVersioning,
  eventDataTransform,
  omitKeys,
  renameKey,
  type Versioning,
} from "./engine.ts";
import { API_VERSIONS, LATEST_API_VERSION } from "./versions.ts";

/** A version after every real one, used by `testVersioning()`. */
export const TEST_NEXT_VERSION = "2099-01-01";

/**
 * The real versions plus `TEST_NEXT_VERSION`, whose changes exercise every transform hook, so tests can run the
 * real handlers (which emit the latest shape) and request `LATEST_API_VERSION` to see a real downgrade:
 * - `email` loses `tracking`; `email_event` (API) and `email.*` webhook data rename `recipient` → `address`;
 * - `webhook_endpoint` loses `api_version`;
 * - `POST /v1/webhook_endpoints` accepts `{ note }` for `description`.
 */
export function testVersioning(): Versioning {
  return createVersioning({
    versions: [...API_VERSIONS, TEST_NEXT_VERSION],
    changes: [
      {
        version: TEST_NEXT_VERSION,
        title: "Test change",
        description: "Only used by tests.",
        responses: {
          email: (email) => omitKeys(email, "tracking"),
          email_event: (event) => renameKey(event, "recipient", "address"),
          webhook_endpoint: (endpoint) => omitKeys(endpoint, "api_version"),
          event: eventDataTransform("email.", (data) => renameKey(data, "recipient", "address")),
        },
        requests: {
          "POST /v1/webhook_endpoints": (body) => {
            if (body === null || typeof body !== "object" || !("note" in body)) return body;
            const { note, ...rest } = body as Record<string, unknown>;
            return { ...rest, description: note };
          },
        },
      },
    ],
  });
}

export { LATEST_API_VERSION as TEST_PREVIOUS_VERSION };
