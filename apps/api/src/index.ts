/** Bun server entry: `bun src/index.ts` serves the default export (`Bun.serve` options). */
import { createApp } from "./app.ts";
import { createDefaultEmailService } from "./email-service.ts";
import { env } from "./env.ts";

const app = createApp({
  emailService: createDefaultEmailService(env),
  publicUrl: env.API_PUBLIC_URL,
  corsOrigins: env.API_CORS_ORIGINS,
});

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
