import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  archiveName,
  CHECKSUMS,
  formatChecksums,
  parseChecksums,
  TARGETS,
} from "../scripts/binaries.ts";
import {
  codesignArgs,
  developerIdIdentity,
  ENTITLEMENTS,
  MACOS_TARGETS,
  notarizationResult,
  repackSigned,
  signatureProblem,
} from "../scripts/notarize.ts";

const sha256 = async (file: string) =>
  createHash("sha256")
    .update(await readFile(file))
    .digest("hex");

/** A release directory like binaries.ts writes: an archive per target and SHA256SUMS. */
async function fakeRelease(version: string) {
  const root = await mkdtemp(join(tmpdir(), "coss-notarize-test-"));
  const release = join(root, "release");
  await mkdir(release);
  const sums: Record<string, string> = {};
  for (const target of TARGETS.filter((t) => t.os !== "windows")) {
    const stage = join(root, target.name);
    await mkdir(stage);
    await writeFile(join(stage, "coss"), `binary for ${target.name}\n`);
    await writeFile(join(stage, "LICENSE"), "MIT\n");
    await writeFile(join(stage, "README.md"), "# coss\n");
    const archive = join(release, archiveName(version, target));
    execFileSync("tar", ["-czf", archive, "coss", "LICENSE", "README.md"], { cwd: stage });
    sums[archiveName(version, target)] = await sha256(archive);
  }
  await writeFile(join(release, CHECKSUMS), formatChecksums(sums));
  return { release, sums };
}

describe("macOS signing and notarization", () => {
  test("repacks each macOS archive with the signed executable and rewrites only their sums", async () => {
    const { release, sums } = await fakeRelease("9.9.9");
    const signed: string[] = [];
    const repacked = await repackSigned(
      release,
      async (file, target) => {
        signed.push(target.name);
        await appendFile(file, "signed\n");
      },
      "9.9.9",
    );
    expect(signed).toEqual(["darwin-arm64", "darwin-x64"]);
    expect(repacked).toEqual(MACOS_TARGETS.map((target) => archiveName("9.9.9", target)));

    const after = parseChecksums(await readFile(join(release, CHECKSUMS), "utf8"));
    for (const [name, sum] of Object.entries(after)) {
      expect(sum).toBe(await sha256(join(release, name)));
      expect(sum === sums[name]).toBe(!name.includes("darwin"));
    }
    const out = await mkdtemp(join(tmpdir(), "coss-notarize-out-"));
    execFileSync("tar", ["-xzf", join(release, "coss-cli-9.9.9-darwin-arm64.tar.gz"), "-C", out]);
    expect(await readFile(join(out, "coss"), "utf8")).toBe("binary for darwin-arm64\nsigned\n");
    const listing = execFileSync("tar", [
      "-tzf",
      join(release, "coss-cli-9.9.9-darwin-x64.tar.gz"),
    ]);
    expect(String(listing).trim().split("\n")).toEqual(["coss", "LICENSE", "README.md"]);
  });

  test("refuses a release without every macOS archive", async () => {
    const { release } = await fakeRelease("9.9.9");
    await expect(repackSigned(release, async () => {}, "1.0.0")).rejects.toThrow(
      "coss-cli-1.0.0-darwin-arm64.tar.gz isn't in",
    );
  });

  test("the keychain's one Developer ID Application identity", () => {
    const id = "A".repeat(40);
    const output = `  1) ${id} "Developer ID Application: Cal.com, Inc. (ABCDE12345)"
  2) ${"B".repeat(40)} "Apple Development: Someone (ZZZZZZZZZZ)"
     2 valid identities found`;
    expect(developerIdIdentity(output)).toBe(id);
    expect(() => developerIdIdentity("     0 valid identities found")).toThrow("found 0");
  });

  test("signatures notarization accepts: hardened runtime, Developer ID, secure timestamp", () => {
    const good = `Executable=/tmp/coss
CodeDirectory v=20500 size=1 flags=0x10000(runtime) hashes=1+7 location=embedded
Authority=Developer ID Application: Cal.com, Inc. (ABCDE12345)
Authority=Developer ID Certification Authority
Timestamp=Oct 19, 2026 at 18:00:00`;
    expect(signatureProblem(good)).toBeNull();
    expect(signatureProblem(good.replace("0x10000(runtime)", "0x2(adhoc)"))).toContain("hardened");
    expect(signatureProblem(good.replace(/^Authority=Developer ID Application.*$/m, ""))).toContain(
      "Developer ID",
    );
    expect(signatureProblem(good.replace(/^Timestamp=.*$/m, ""))).toContain("timestamp");
  });

  test("codesign arguments, entitlements and notarytool's answer", () => {
    expect(codesignArgs("ID", "/e.plist", "/f")).toEqual([
      "--force",
      "--timestamp",
      "--options",
      "runtime",
      "--entitlements",
      "/e.plist",
      "--sign",
      "ID",
      "/f",
    ]);
    for (const key of [
      "allow-jit",
      "allow-unsigned-executable-memory",
      "disable-library-validation",
    ]) {
      expect(ENTITLEMENTS).toContain(`<key>com.apple.security.cs.${key}</key>`);
    }
    expect(notarizationResult('{"id":"abc","status":"Accepted","message":"ok"}')).toEqual({
      id: "abc",
      status: "Accepted",
    });
    expect(() => notarizationResult("{}")).toThrow("no id and status");
  });
});
