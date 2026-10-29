/** Forms' environment variables (zod only: safe for t3-env schemas and `infra`). */
import { z } from "zod";

export const formsPublicEnvShape = {
  /**
   * The origin forms are served on (a registrable domain of its own, so abuse reports never land
   * on coss.com): endpoints are `<FORMS_PUBLIC_URL>/f/<id>`. Outside production the API's own
   * origin.
   */
  FORMS_PUBLIC_URL:
    process.env.NODE_ENV === "production"
      ? z.url().optional()
      : z.url().default("http://localhost:3001"),
};

/** Where uploaded files live (api, worker, dashboard). */
export const formsStoreEnvShape = {
  /**
   * The S3 bucket of uploaded files (with `AWS_REGION`). Unset: the fake store (Postgres) outside
   * production; in production, forms refuse uploads.
   */
  FORMS_FILES_BUCKET: z.string().min(3).optional(),
  AWS_REGION: z.string().min(1).optional(),
};

/** The worker's sender of notification emails for forms without their own `from`. */
export const formsNotificationsEnvShape = {
  /** Default: `NOTIFICATIONS_FROM`'s address. */
  FORMS_NOTIFICATIONS_FROM: z.string().min(3).optional(),
};
