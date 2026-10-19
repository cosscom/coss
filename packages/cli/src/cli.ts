#!/usr/bin/env node
import { flushOutput, nodeIo } from "./io.ts";
import { run } from "./run.ts";

process.exitCode = await run(process.argv.slice(2), nodeIo());
// Pipes are asynchronous: exiting before every write has reached the OS would cut output short.
await flushOutput();
// Commands end their own work; don't wait on keep-alive sockets or stdin.
process.exit();
