#!/usr/bin/env node
import { nodeIo } from "./io.ts";
import { run } from "./run.ts";

process.exitCode = await run(process.argv.slice(2), nodeIo());
// Commands end their own work; don't wait on keep-alive sockets or stdin.
process.exit();
