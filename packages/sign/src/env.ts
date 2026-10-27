/** Sign's environment variables (zod only: safe for t3-env schemas and `infra`). */
import { z } from "zod";

export const signSealEnvShape = {
  /**
   * What seals completed documents: `kms` (an AWS KMS key whose certificate chain is
   * `SIGN_SEAL_CERTIFICATE_CHAIN`, production) or `local` (a self-signed key made at start,
   * development). Unset in production until the certificate is issued: completions wait.
   */
  SIGN_SEALER:
    process.env.NODE_ENV === "production"
      ? z.enum(["kms", "local"]).optional()
      : z.enum(["kms", "local"]).default("local"),
  /** The KMS key (id, ARN or alias) that signs, with `SIGN_SEALER=kms`. */
  SIGN_SEAL_KMS_KEY_ID: z.string().min(1).optional(),
  /** Its certificate and the chain up to (not including) the root: PEM, leaf first. */
  SIGN_SEAL_CERTIFICATE_CHAIN: z.string().min(1).optional(),
  /** An RFC 3161 time-stamping authority's URL; unset: seals carry no trusted timestamp. */
  SIGN_TSA_URL: z.url().optional(),
};
