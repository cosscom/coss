import { formsS3Api, S3FormFileStore } from "./s3-store.ts";
import { FakeFormFileStore, type FormFileStore } from "./store.ts";

/**
 * The file store: S3 with `FORMS_FILES_BUCKET`, else the fake store outside production; `null` in
 * production without a bucket (forms then refuse uploads).
 */
export function formsStoreFromEnv(env: {
  FORMS_FILES_BUCKET?: string;
  AWS_REGION?: string;
}): FormFileStore | null {
  if (env.FORMS_FILES_BUCKET) {
    if (!env.AWS_REGION) throw new Error("FORMS_FILES_BUCKET needs AWS_REGION.");
    return new S3FormFileStore(
      formsS3Api({ region: env.AWS_REGION, bucket: env.FORMS_FILES_BUCKET }),
    );
  }
  return process.env.NODE_ENV === "production" ? null : new FakeFormFileStore();
}
