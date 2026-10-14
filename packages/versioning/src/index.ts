import { VERSION_CHANGES } from "./changes.ts";
import { createVersioning, type Versioning } from "./engine.ts";
import { API_VERSIONS } from "./versions.ts";

export { VERSION_CHANGES } from "./changes.ts";
export {
  createVersioning,
  eventDataTransform,
  type JsonObject,
  type ObjectTransform,
  OPAQUE_FIELDS,
  omitKeys,
  type RequestKey,
  type RequestTransform,
  renameKey,
  type VersionChange,
  type Versioning,
  type VersionRegistry,
} from "./engine.ts";
export {
  API_VERSION_FORMAT,
  API_VERSION_HEADER,
  API_VERSIONS,
  type ApiVersion,
  LATEST_API_VERSION,
} from "./versions.ts";

/** The public API's versions and changes. */
export const versioning: Versioning = createVersioning({
  versions: API_VERSIONS,
  changes: VERSION_CHANGES,
});
