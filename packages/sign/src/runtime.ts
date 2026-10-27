import { S3DocumentStore, signS3Api } from "./s3-store.ts";
/**
 * Completion's sealer and TSA from the environment (`signSealEnvShape`): `null` when this
 * deployment can't seal yet (production without a KMS key and certificate), and the worker's
 * completion loop doesn't run.
 */
import { certificatesFromPem } from "./seal/crypto.ts";
import { KmsSealer, LocalSealer, type Sealer } from "./seal/sealer.ts";
import { HttpTsa, type TimestampAuthority } from "./seal/tsa.ts";
import { type DocumentStore, FakeDocumentStore } from "./store.ts";

/** `signSealEnvShape`, parsed. */
type SignSealEnv = {
  SIGN_SEALER?: "kms" | "local";
  SIGN_SEAL_KMS_KEY_ID?: string;
  SIGN_SEAL_CERTIFICATE_CHAIN?: string;
  SIGN_TSA_URL?: string;
};

export async function sealerFromEnv(
  env: SignSealEnv,
): Promise<{ sealer: Sealer; tsa: TimestampAuthority | null } | null> {
  const tsa = env.SIGN_TSA_URL ? new HttpTsa(env.SIGN_TSA_URL) : null;
  if (env.SIGN_SEALER === "local") return { sealer: await LocalSealer.create(), tsa };
  if (env.SIGN_SEALER === "kms") {
    if (!env.SIGN_SEAL_KMS_KEY_ID || !env.SIGN_SEAL_CERTIFICATE_CHAIN) {
      throw new Error(
        "SIGN_SEALER=kms needs SIGN_SEAL_KMS_KEY_ID and SIGN_SEAL_CERTIFICATE_CHAIN.",
      );
    }
    return {
      sealer: new KmsSealer({
        keyId: env.SIGN_SEAL_KMS_KEY_ID,
        certificateChain: certificatesFromPem(env.SIGN_SEAL_CERTIFICATE_CHAIN),
      }),
      tsa,
    };
  }
  return null;
}

/**
 * The document store: S3 with `SIGN_DOCUMENTS_BUCKET`, else the fake store outside production;
 * `null` in production without a bucket (Sign stays off there).
 */
export function signStoreFromEnv(env: {
  SIGN_DOCUMENTS_BUCKET?: string;
  AWS_REGION?: string;
}): DocumentStore | null {
  if (env.SIGN_DOCUMENTS_BUCKET) {
    if (!env.AWS_REGION) throw new Error("SIGN_DOCUMENTS_BUCKET needs AWS_REGION.");
    return new S3DocumentStore(
      signS3Api({ region: env.AWS_REGION, bucket: env.SIGN_DOCUMENTS_BUCKET }),
    );
  }
  return process.env.NODE_ENV === "production" ? null : new FakeDocumentStore();
}
