import { fetchSetupReport } from "coss";
import { z } from "zod";
import { ok } from "../result.ts";
import { READ_ONLY, type ToolContext } from "./shared.ts";

export function registerSetupTools(ctx: ToolContext): void {
  const { server, coss } = ctx;

  server.registerTool(
    "get_setup",
    {
      title: "Get setup status",
      description:
        "Where this API key stands for sending: its mode, a from address that will succeed, " +
        "DNS records still missing on domains that cannot send, webhook endpoints, and one " +
        "`next` string — the single thing to do now. Call this before writing send code. A " +
        "sandbox key accepts any from address; a live key needs a domain with `can_send`. " +
        "Domain or endpoint list failures come back as `warning` and do not drop `next`.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => ok(await fetchSetupReport(coss)),
  );
}
