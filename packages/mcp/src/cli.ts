#!/usr/bin/env node
/**
 * `npx coss-mcp`: the COSS MCP server over stdio. Configuration comes from the environment only
 * (never argv, which other local processes can read): COSS_API_KEY, and COSS_BASE_URL to point
 * at another API (e.g. http://localhost:3001). stdout carries the protocol; logs go to stderr.
 */
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { Coss } from "coss";
import { createCossMcpServer } from "./server.ts";

const apiKey = process.env.COSS_API_KEY?.trim();
if (!apiKey) {
  console.error(
    "coss-mcp: set COSS_API_KEY to a COSS API key (create one in the dashboard: https://coss.com/dashboard).",
  );
  process.exit(1);
}

const coss = new Coss({ apiKey, baseUrl: process.env.COSS_BASE_URL?.trim() || undefined });

serveStdio(() => createCossMcpServer({ coss, apiKey }), {
  onerror: (error) => console.error("coss-mcp:", error),
});
