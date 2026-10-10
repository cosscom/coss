export {
  accountOf,
  createSesApi,
  isSesError,
  type SesApi,
  type SesConfig,
  TENANT_SUPPRESSION,
  tenantNameFor,
} from "./api.ts";
export { MANAGED_TAG, SesIdentityProvider } from "./identity.ts";
export { encodeAddress, encodeWords } from "./mime.ts";
export {
  type ParsedSesMessage,
  parseSesEvent,
  parseSesMessage,
  type TenantStatusEvent,
} from "./parse.ts";
export { EMAIL_ID_TAG, SesEmailProvider } from "./provider.ts";
