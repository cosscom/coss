// The diagnosis lives in the SDK now (`coss/diagnose`); re-exported for existing imports.
export {
  type Diagnosis,
  type DiagnosisContext,
  diagnoseEmail,
  type RecipientDiagnosis,
  type RecipientOutcome,
  type Verdict,
} from "coss/diagnose";
export { type CossMcpServerOptions, createCossMcpServer } from "./server.ts";
export { VERSION } from "./version.ts";
