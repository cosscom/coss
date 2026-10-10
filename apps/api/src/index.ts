/** Bun server entry: `bun src/index.ts` serves the default export (`Bun.serve` options). */
import { createApp } from "./app.ts";
import { createDefaultEmailService } from "./email-service.ts";
import { env } from "./env.ts";

const app = createApp({
  emailService: createDefaultEmailService(env.EMAIL_PROVIDER),
  publicUrl: env.API_PUBLIC_URL,
});

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
