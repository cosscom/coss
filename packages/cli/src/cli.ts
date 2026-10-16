#!/usr/bin/env node
import { nodeIo } from "./io.ts";
import { run } from "./run.ts";

/** Resolves once everything written to `stream` so far has reached the OS (pipes are async). */
function flushed(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (stream.writableLength === 0) return resolve();
    // Writes complete in order: this one's callback comes after every earlier one's.
    stream.write("", () => resolve());
  });
}

process.exitCode = await run(process.argv.slice(2), nodeIo());
await Promise.all([flushed(process.stdout), flushed(process.stderr)]);
// Commands end their own work; don't wait on keep-alive sockets or stdin.
process.exit();
