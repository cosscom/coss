import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };
import {
  archiveName,
  buildBinaries,
  CHECKSUMS,
  changelogSection,
  formatChecksums,
  nativeTarget,
  parseChecksums,
  TARGETS,
} from "../scripts/binaries.ts";
import { releaseUrl, renderFormula } from "../scripts/homebrew.ts";
import { smoke } from "../scripts/smoke-binary.ts";

const SHA = (n: number) => String(n).repeat(64).slice(0, 64);

describe("binary targets", () => {
  test("names, archives and this machine's target", () => {
    expect(new Set(TARGETS.map((t) => t.name)).size).toBe(TARGETS.length);
    const linux = TARGETS.find((t) => t.name === "linux-x64");
    const windows = TARGETS.find((t) => t.name === "windows-x64");
    expect(linux && archiveName("1.2.3", linux)).toBe("coss-cli-1.2.3-linux-x64.tar.gz");
    expect(windows && archiveName("1.2.3", windows)).toBe("coss-cli-1.2.3-windows-x64.zip");
    expect(nativeTarget("darwin", "arm64").name).toBe("darwin-arm64");
    expect(nativeTarget("linux", "x64").name).toBe("linux-x64");
    expect(nativeTarget("win32", "x64").name).toBe("windows-x64");
    expect(() => nativeTarget("freebsd", "x64")).toThrow();
  });

  test("SHA256SUMS in sha256sum's format, both ways", () => {
    const text = formatChecksums({ "b.tar.gz": SHA(2), "a.zip": SHA(1) });
    expect(text).toBe(`${SHA(1)}  a.zip\n${SHA(2)}  b.tar.gz\n`);
    expect(parseChecksums(text)).toEqual({ "a.zip": SHA(1), "b.tar.gz": SHA(2) });
    expect(() => parseChecksums("nope  a.zip\n")).toThrow();
  });

  test("a version's CHANGELOG section is the release notes", () => {
    const changelog =
      "# coss-cli\n\n## 0.2.0\n\n### Minor Changes\n\n- New.\n\n## 0.1.0\n\n- Old.\n";
    expect(changelogSection(changelog, "0.2.0")).toBe("### Minor Changes\n\n- New.");
    expect(changelogSection(changelog, "0.1.0")).toBe("- Old.");
    expect(changelogSection(changelog, "9.9.9")).toBe("");
  });
});

describe("the Homebrew formula", () => {
  const checksums = Object.fromEntries(
    TARGETS.map((target, index) => [archiveName("1.2.3", target), SHA(index + 1)]),
  );

  test("one url and sha256 per macOS and glibc Linux target", () => {
    const formula = renderFormula({ version: "1.2.3", checksums });
    expect(formula).toContain('version "1.2.3"');
    for (const name of ["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64"]) {
      const file = `coss-cli-1.2.3-${name}.tar.gz`;
      expect(formula).toContain(`url "${releaseUrl("1.2.3", file)}"`);
      expect(formula).toContain(`sha256 "${checksums[file]}"`);
    }
    expect(formula).not.toContain("musl");
    expect(formula).not.toContain("windows");
    expect(releaseUrl("1.2.3", "x.tar.gz")).toBe(
      "https://github.com/cosscom/coss/releases/download/coss-cli%401.2.3/x.tar.gz",
    );
    expect(formula).toContain('generate_completions_from_executable(bin/"coss", "completion")');
  });

  test("refuses a missing checksum or a bad version", () => {
    const { "coss-cli-1.2.3-linux-arm64.tar.gz": _, ...partial } = checksums;
    expect(() => renderFormula({ version: "1.2.3", checksums: partial })).toThrow(/linux-arm64/);
    expect(() => renderFormula({ version: '1.2.3" ; system "x', checksums })).toThrow();
  });
});

// Builds this machine's binary, installs it with install.sh from a local "release", and runs the
// smoke test on what got installed: the compiled runtime, the archive, the checksum check.
describe.skipIf(process.platform === "win32")("this machine's binary, through install.sh", () => {
  test(
    "builds, installs (checking SHA256SUMS) and passes the smoke test",
    async () => {
      const out = await mkdtemp(join(tmpdir(), "coss-binaries-"));
      const { release } = await buildBinaries([nativeTarget()], out);
      let sums = await readFile(join(release, CHECKSUMS), "utf8");
      const server = Bun.serve({
        port: 0,
        hostname: "127.0.0.1",
        fetch(request) {
          const path = decodeURIComponent(new URL(request.url).pathname);
          const prefix = `/coss-cli@${pkg.version}/`;
          if (!path.startsWith(prefix)) return new Response("Not found", { status: 404 });
          const file = path.slice(prefix.length);
          if (file === CHECKSUMS) return new Response(sums);
          return new Response(Bun.file(join(release, file)));
        },
      });
      // Not spawned synchronously: the server above answers on this process's event loop.
      const install = async (dir: string) => {
        const child = Bun.spawn(["sh", resolve(import.meta.dir, "../install.sh")], {
          env: {
            PATH: process.env.PATH ?? "",
            HOME: out,
            COSS_VERSION: pkg.version,
            COSS_INSTALL_DIR: dir,
            COSS_RELEASES_URL: `http://127.0.0.1:${server.port}`,
          },
          stdout: "pipe",
          stderr: "pipe",
        });
        const stderr = await new Response(child.stderr).text();
        return { code: await child.exited, stderr };
      };
      try {
        const installed = await install(join(out, "bin"));
        expect(installed).toMatchObject({ code: 0 });
        expect(installed.stderr).toContain(`Installed coss ${pkg.version}`);
        await smoke(join(out, "bin", "coss"));

        // A download that doesn't match its checksum is never installed.
        sums = sums.replace(/^[0-9a-f]{64}/, "0".repeat(64));
        const tampered = await install(join(out, "tampered"));
        expect(tampered.code).toBe(1);
        expect(tampered.stderr).toContain("doesn't match its checksum");
        expect(await Bun.file(join(out, "tampered", "coss")).exists()).toBe(false);
      } finally {
        server.stop(true);
        await rm(out, { recursive: true, force: true });
      }
    },
    { timeout: 120_000 },
  );
});
