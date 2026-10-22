#!/usr/bin/env node
/**
 * `npx coss-mcp`: the coss.com MCP server over stdio. Configuration comes from the environment only
 * (never argv, which other local processes can read): COSS_API_KEY, and COSS_BASE_URL to point
 * at another API (e.g. http://localhost:3001). Without a key it serves only the docs tools.
 * stdout carries the protocol; logs go to stderr.
 */
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { Coss } from "coss";
import { createCossMcpServer } from "./server.ts";

const apiKey = process.env.COSS_API_KEY?.trim();
if (!apiKey) {
  console.error(
    "coss-mcp: no COSS_API_KEY, so only the docs tools are available. Run `npx coss-cli init` in " +
      "your project for a development key, or create one in the dashboard (https://coss.com/dashboard).",
  );
}

const coss = apiKey
  ? new Coss({ apiKey, baseUrl: process.env.COSS_BASE_URL?.trim() || undefined })
  : undefined;

serveStdio(() => createCossMcpServer({ coss, apiKey }), {
  onerror: (error) => console.error("coss-mcp:", error),
});
