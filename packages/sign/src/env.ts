/** Sign's environment variables (zod only: safe for t3-env schemas and `infra`). */
import { z } from "zod";

export const signSealEnvShape = {
  /**
   * What seals completed documents: `kms` (an AWS KMS key whose certificate chain is
   * `SIGN_SEAL_CERTIFICATE_CHAIN`), `csc` (a key at the CA, behind a Cloud Signature Consortium
   * API: `SIGN_CSC_*`) or `local` (a self-signed key made at start, development). Unset in
   * production until the certificate is issued: completions wait.
   */
  SIGN_SEALER:
    process.env.NODE_ENV === "production"
      ? z.enum(["kms", "csc", "local"]).optional()
      : z.enum(["kms", "csc", "local"]).default("local"),
  /** The KMS key (id, ARN or alias) that signs, with `SIGN_SEALER=kms`. */
  SIGN_SEAL_KMS_KEY_ID: z.string().min(1).optional(),
  /** Its certificate and the chain up to (not including) the root: PEM, leaf first. */
  SIGN_SEAL_CERTIFICATE_CHAIN: z.string().min(1).optional(),
  /** With `SIGN_SEALER=csc`: the API's root with its version (`https://cs.ssl.com/csc/v1`). */
  SIGN_CSC_URL: z.url().optional(),
  /** Its OAuth 2.0 token endpoint (password grant; `https://login.ssl.com/oauth2/token`). */
  SIGN_CSC_TOKEN_URL: z.url().optional(),
  SIGN_CSC_CLIENT_ID: z.string().min(1).optional(),
  /** Only when the CA's OAuth client is confidential. */
  SIGN_CSC_CLIENT_SECRET: z.string().min(1).optional(),
  SIGN_CSC_USERNAME: z.string().min(1).optional(),
  SIGN_CSC_PASSWORD: z.string().min(1).optional(),
  /** The signing credential (SSL.com: `credentials/list` with `clientData: "DS_ESEAL"`). */
  SIGN_CSC_CREDENTIAL_ID: z.string().min(1).optional(),
  /** Base64 TOTP secret, only for a credential that wants a one-time password per signature. */
  SIGN_CSC_TOTP_SECRET: z.string().min(1).optional(),
  /** An RFC 3161 time-stamping authority's URL; unset: seals carry no trusted timestamp. */
  SIGN_TSA_URL: z.url().optional(),
};

/** Where documents' bytes live (api, signing app, worker). */
export const signStoreEnvShape = {
  /**
   * The S3 bucket of documents, signatures and signed PDFs (with `AWS_REGION`). Unset: the fake
   * store (Postgres) outside production, and Sign off in production.
   */
  SIGN_DOCUMENTS_BUCKET: z.string().min(3).optional(),
  AWS_REGION: z.string().min(1).optional(),
};
