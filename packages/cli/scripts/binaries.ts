/**
 * Standalone `coss` executables, for GitHub releases, Homebrew and `install.sh`: `bun build
 * --compile` of `src/cli.ts` for each platform (the Bun runtime is inside, so no Node.js is
 * needed), archived with the licence and README, plus a `SHA256SUMS` of the archives.
 *
 *   bun scripts/binaries.ts                 # every target, into binaries/release
 *   bun scripts/binaries.ts native          # this machine's only
 *   bun scripts/binaries.ts linux-x64 --out /tmp/coss
 *   bun scripts/binaries.ts --notes         # this version's CHANGELOG section (release notes)
 *
 * Cross-compiling downloads each target's Bun runtime once. macOS executables come out ad-hoc
 * signed (Apple Silicon refuses unsigned ones); they aren't notarized.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };

export type Target = {
  /** In archive names: `coss-cli-<version>-<name>.tar.gz`. */
  name: string;
  /** `bun build --target`. x64 uses the baseline builds, which don't need AVX2. */
  bun: string;
  os: "darwin" | "linux" | "windows";
  arch: "arm64" | "x64";
  libc?: "musl";
};

export const TARGETS: readonly Target[] = [
  { name: "darwin-arm64", bun: "bun-darwin-arm64", os: "darwin", arch: "arm64" },
  { name: "darwin-x64", bun: "bun-darwin-x64-baseline", os: "darwin", arch: "x64" },
  { name: "linux-arm64", bun: "bun-linux-arm64", os: "linux", arch: "arm64" },
  { name: "linux-x64", bun: "bun-linux-x64-baseline", os: "linux", arch: "x64" },
  {
    name: "linux-arm64-musl",
    bun: "bun-linux-arm64-musl",
    os: "linux",
    arch: "arm64",
    libc: "musl",
  },
  {
    name: "linux-x64-musl",
    bun: "bun-linux-x64-musl-baseline",
    os: "linux",
    arch: "x64",
    libc: "musl",
  },
  { name: "windows-x64", bun: "bun-windows-x64-baseline", os: "windows", arch: "x64" },
];

export const CHECKSUMS = "SHA256SUMS";

export function archiveName(version: string, target: Target): string {
  return `coss-cli-${version}-${target.name}.${target.os === "windows" ? "zip" : "tar.gz"}`;
}

export function executableName(target: Target): string {
  return target.os === "windows" ? "coss.exe" : "coss";
}

/** This machine's target (glibc on Linux; pass a musl one by name). */
export function nativeTarget(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): Target {
  const os = platform === "win32" ? "windows" : platform;
  const target = TARGETS.find((t) => t.os === os && t.arch === arch && !t.libc);
  if (!target) throw new Error(`No coss binary target for ${platform}-${arch}.`);
  return target;
}

/** `sha256sum`'s format, sorted by name: `<hex>  <file>`. */
export function formatChecksums(sums: Record<string, string>): string {
  return Object.keys(sums)
    .sort()
    .map((file) => `${sums[file]}  ${file}\n`)
    .join("");
}

export function parseChecksums(text: string): Record<string, string> {
  const sums: Record<string, string> = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
    if (!match?.[1] || !match[2]) throw new Error(`Not a SHA256SUMS line: "${line}"`);
    sums[match[2]] = match[1];
  }
  return sums;
}

/** The CHANGELOG.md section of `version` (what follows `## <version>`), for the release notes. */
export function changelogSection(changelog: string, version: string): string {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start < 0) return "";
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join("\n")
    .trim();
}

const ROOT = resolve(import.meta.dir, "..");

function run(command: string, args: string[], cwd = ROOT): void {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

/** Builds `targets` into `<out>/stage/<name>/` and archives them into `<out>/release/`. */
export async function buildBinaries(
  targets: readonly Target[],
  out: string,
  version: string = pkg.version,
): Promise<{ release: string; archives: string[] }> {
  const release = join(out, "release");
  // Only what this script writes: `--out` may be a directory with other things in it.
  await rm(release, { recursive: true, force: true });
  await rm(join(out, "stage"), { recursive: true, force: true });
  await mkdir(release, { recursive: true });
  const sums: Record<string, string> = {};
  for (const target of targets) {
    const stage = join(out, "stage", target.name);
    await mkdir(stage, { recursive: true });
    const executable = executableName(target);
    run(process.execPath, [
      "build",
      "src/cli.ts",
      "--compile",
      "--minify",
      // Embedded, so stack traces of unexpected errors point at the source.
      "--sourcemap",
      `--target=${target.bun}`,
      `--outfile=${join(stage, executable)}`,
    ]);
    await copyFile(join(ROOT, "LICENSE"), join(stage, "LICENSE"));
    await copyFile(join(ROOT, "README.md"), join(stage, "README.md"));
    const archive = join(release, archiveName(version, target));
    const files = [executable, "LICENSE", "README.md"];
    if (target.os === "windows") run("zip", ["-q", "-X", archive, ...files], stage);
    else run("tar", ["-czf", archive, ...files], stage);
    sums[archiveName(version, target)] = createHash("sha256")
      .update(await readFile(archive))
      .digest("hex");
  }
  await writeFile(join(release, CHECKSUMS), formatChecksums(sums));
  const archives = (await readdir(release)).filter((file) => file !== CHECKSUMS);
  return { release, archives };
}

function targetsFrom(names: string[]): Target[] {
  if (names.length === 0) return [...TARGETS];
  return names.map((name) => {
    if (name === "native") return nativeTarget();
    const target = TARGETS.find((t) => t.name === name);
    if (!target) {
      throw new Error(
        `Unknown target "${name}": ${TARGETS.map((t) => t.name).join(", ")}, native.`,
      );
    }
    return target;
  });
}

if (import.meta.main && process.argv[2] === "--notes") {
  const notes = changelogSection(await readFile(join(ROOT, "CHANGELOG.md"), "utf8"), pkg.version);
  console.log(notes || `coss-cli ${pkg.version}`);
} else if (import.meta.main) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outArg = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (outIndex >= 0 && !outArg) throw new Error("--out takes a directory.");
  const out = resolve(outArg ?? join(ROOT, "binaries"));
  const names = outIndex >= 0 ? args.filter((_, i) => i !== outIndex && i !== outIndex + 1) : args;
  const { release, archives } = await buildBinaries(targetsFrom(names), out);
  console.log(`coss ${pkg.version}: ${archives.length} archives and ${CHECKSUMS} in ${release}`);
}
