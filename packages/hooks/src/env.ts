/** Hooks environment variables (zod only: safe for t3-env schemas and `infra`). */
import { z } from "zod";

export const hookEnvShape = {
  /** Where the portal is served (`https://<portal host>`); portal session links point here. */
  PORTAL_PUBLIC_URL:
    process.env.NODE_ENV === "production" ? z.url() : z.url().default("http://localhost:3003"),
};
