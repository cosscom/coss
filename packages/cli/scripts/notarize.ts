/**
 * Signs the macOS executables of a release `binaries.ts` built with coss.com's Developer ID (the
 * hardened runtime, which notarization requires) and has Apple notarize them, then archives them
 * again and rewrites `SHA256SUMS`. A downloaded copy then opens without Gatekeeper's warning: a
 * bare executable can't carry a stapled ticket, so Gatekeeper looks the notarization up online.
 *
 *   bun scripts/notarize.ts <release dir>      # on macOS: codesign and notarytool are Apple's
 *
 * Signs with APPLE_SIGNING_IDENTITY, else the keychain's one "Developer ID Application" identity.
 * notarytool submits with an App Store Connect API key: APPLE_NOTARY_KEY_PATH (the .p8),
 * APPLE_NOTARY_KEY_ID and APPLE_NOTARY_ISSUER_ID.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };
import {
  archiveName,
  CHECKSUMS,
  executableName,
  formatChecksums,
  parseChecksums,
  TARGETS,
  type Target,
} from "./binaries.ts";

/** Bun's JavaScript engine compiles code at run time: what the hardened runtime must allow. */
export const ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-executable-page-protection</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
`;

export const MACOS_TARGETS: readonly Target[] = TARGETS.filter((target) => target.os === "darwin");

export function codesignArgs(identity: string, entitlements: string, file: string): string[] {
  return [
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--entitlements",
    entitlements,
    "--sign",
    identity,
    file,
  ];
}

/** The one "Developer ID Application" identity `security find-identity` lists. */
export function developerIdIdentity(findIdentityOutput: string): string {
  const identities = [
    ...findIdentityOutput.matchAll(
      /^\s*\d+\)\s+([0-9A-F]{40})\s+"(Developer ID Application: [^"]+)"/gm,
    ),
  ].map((match) => match[1] ?? "");
  const unique = [...new Set(identities)];
  if (unique.length !== 1) {
    throw new Error(
      `Expected one "Developer ID Application" identity in the keychain, found ${unique.length}: set APPLE_SIGNING_IDENTITY.`,
    );
  }
  return unique[0] ?? "";
}

/** What notarization would refuse in `codesign --display --verbose=2`'s output, or `null`. */
export function signatureProblem(display: string): string | null {
  if (!/^CodeDirectory .*flags=0x[0-9a-f]*\(runtime\)/m.test(display)) {
    return "not signed with the hardened runtime";
  }
  if (!/^Authority=Developer ID Application: /m.test(display)) {
    return "not signed with a Developer ID Application certificate";
  }
  if (!/^Timestamp=/m.test(display)) return "the signature has no secure timestamp";
  return null;
}

/** notarytool's `--output-format json` answer: the submission's id and status. */
export function notarizationResult(json: string): { id: string; status: string } {
  const answer = JSON.parse(json) as { id?: unknown; status?: unknown };
  if (typeof answer.id !== "string" || typeof answer.status !== "string") {
    throw new Error(`notarytool's answer has no id and status: ${json}`);
  }
  return { id: answer.id, status: answer.status };
}

function run(command: string, args: string[], options: { cwd?: string } = {}): string {
  return execFileSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    // bsdtar would add `._` AppleDouble files for extended attributes.
    env: { ...process.env, COPYFILE_DISABLE: "1" },
    stdio: ["ignore", "pipe", "inherit"],
  });
}

const sha256 = async (file: string) =>
  createHash("sha256")
    .update(await readFile(file))
    .digest("hex");

/**
 * Extracts each macOS archive of `release`, hands its executable to `sign` (which must sign it in
 * place), archives the same files again and rewrites `SHA256SUMS` for them. Every macOS target
 * must be there: a release with only some of them notarized would be a surprise.
 */
export async function repackSigned(
  release: string,
  sign: (executable: string, target: Target) => Promise<void>,
  version: string = pkg.version,
): Promise<string[]> {
  const sums = parseChecksums(await readFile(join(release, CHECKSUMS), "utf8"));
  const repacked: string[] = [];
  for (const target of MACOS_TARGETS) {
    const name = archiveName(version, target);
    const archive = join(release, name);
    if (!(await stat(archive).catch(() => null)) || !sums[name]) {
      throw new Error(`${name} isn't in ${release} (or in its ${CHECKSUMS}).`);
    }
    const work = await mkdtemp(join(tmpdir(), `coss-notarize-${target.name}-`));
    try {
      run("tar", ["-xzf", archive, "-C", work]);
      const executable = join(work, executableName(target));
      await sign(executable, target);
      // The archive binaries.ts makes: the same files, in the same order.
      run("tar", ["-czf", archive, executableName(target), "LICENSE", "README.md"], { cwd: work });
      sums[name] = await sha256(archive);
      repacked.push(name);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
  await writeFile(join(release, CHECKSUMS), formatChecksums(sums));
  return repacked;
}

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} isn't set.`);
  return value;
}

/** The App Store Connect API key notarytool authenticates with. */
function notaryAuth(): string[] {
  return [
    "--key",
    env("APPLE_NOTARY_KEY_PATH"),
    "--key-id",
    env("APPLE_NOTARY_KEY_ID"),
    "--issuer",
    env("APPLE_NOTARY_ISSUER_ID"),
  ];
}

/** Signs `file` with the Developer ID, then waits for Apple's notarization of it. */
async function signAndNotarize(file: string, entitlements: string, identity: string) {
  run("codesign", codesignArgs(identity, entitlements, file));
  run("codesign", ["--verify", "--strict", "--verbose=2", file]);
  // `codesign --display` writes its details on stderr.
  const display = spawnSync("codesign", ["--display", "--verbose=2", file], { encoding: "utf8" });
  const problem = signatureProblem(`${display.stdout}${display.stderr}`);
  if (problem) throw new Error(`${file}: ${problem}`);
  const zip = `${file}.zip`;
  run("ditto", ["-c", "-k", "--keepParent", file, zip]);
  // Read the answer whatever the exit code: a refused submission's id is how to get its log.
  const submit = spawnSync(
    "xcrun",
    [
      "notarytool",
      "submit",
      zip,
      ...notaryAuth(),
      "--wait",
      "--timeout",
      "30m",
      "--output-format",
      "json",
    ],
    { encoding: "utf8" },
  );
  let answer: { id: string; status: string };
  try {
    answer = notarizationResult(submit.stdout);
  } catch {
    throw new Error(
      `notarytool submit failed (exit ${submit.status}): ${submit.stderr || submit.stdout}`,
    );
  }
  await rm(zip, { force: true });
  if (answer.status !== "Accepted") {
    const log = spawnSync("xcrun", ["notarytool", "log", answer.id, ...notaryAuth()], {
      encoding: "utf8",
    });
    throw new Error(
      `Notarization of ${file} ended ${answer.status} (${answer.id}):\n${log.stdout || log.stderr}`,
    );
  }
  console.log(`Notarized ${file} (${answer.id}).`);
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) throw new Error("Usage: bun scripts/notarize.ts <release dir>");
  if (process.platform !== "darwin") throw new Error("Signing and notarizing need macOS.");
  const release = resolve(dir);
  const identity =
    process.env.APPLE_SIGNING_IDENTITY?.trim() ||
    developerIdIdentity(run("security", ["find-identity", "-v", "-p", "codesigning"]));
  const work = await mkdtemp(join(tmpdir(), "coss-entitlements-"));
  const entitlements = join(work, "entitlements.plist");
  await writeFile(entitlements, ENTITLEMENTS);
  try {
    const repacked = await repackSigned(release, (file) =>
      signAndNotarize(file, entitlements, identity),
    );
    console.log(`Signed, notarized and archived again: ${repacked.join(", ")}.`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
