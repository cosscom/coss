/**
 * Keeps the deployment spec honest: every variable an app validates is declared for its service,
 * everything declared reaches tasks through turbo, and the Dockerfiles use the repo's versions.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { emailEnvShape, emailWorkerEnvShape } from "@coss/email/env";
import { rateLimitEnvShape } from "@coss/ratelimit/env";
import { screeningEnvShape } from "@coss/screening/env";
import { albListenerRules, cossComCacheBehaviours } from "../aws/routing.ts";
import { SERVICES, type ServiceName } from "../aws/services.ts";

const ROOT = path.resolve(import.meta.dir, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const readTurbo = () =>
  JSON.parse(read("turbo.json")) as { globalEnv: string[]; globalPassThroughEnv: string[] };

/** Keys of an app's t3-env `server` schema, including the spread email shape. */
function schemaKeys(envFile: string, spread: Record<string, unknown>): string[] {
  const source = read(envFile);
  const own = [...source.matchAll(/^ {4}([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1] ?? "");
  return [
    ...own,
    ...(source.includes("...email") ? Object.keys(spread) : []),
    ...(source.includes("...rateLimitEnvShape") ? Object.keys(rateLimitEnvShape) : []),
    ...(source.includes("...screeningEnvShape") ? Object.keys(screeningEnvShape) : []),
  ];
}

const SCHEMAS: Record<Exclude<ServiceName, "site">, string[]> = {
  web: schemaKeys("apps/web/src/env.ts", emailEnvShape),
  api: schemaKeys("apps/api/src/env.ts", emailEnvShape),
  worker: schemaKeys("apps/worker/src/env.ts", emailWorkerEnvShape),
};

describe("services", () => {
  for (const [name, keys] of Object.entries(SCHEMAS)) {
    test(`${name}: every validated variable is declared`, () => {
      const service = SERVICES.find((candidate) => candidate.name === name);
      const declared = new Set(service?.env.map((variable) => variable.name));
      expect(keys.length).toBeGreaterThan(2);
      for (const key of keys)
        expect({ key, declared: declared.has(key) }).toEqual({ key, declared: true });
    });
  }

  test("declared variables reach tasks (turbo strict env mode) unless the image sets them", () => {
    const turbo = readTurbo();
    const reaching = new Set([...turbo.globalEnv, ...turbo.globalPassThroughEnv]);
    for (const service of SERVICES) {
      for (const variable of service.env) {
        if (variable.kind === "image") continue;
        expect({ name: variable.name, inTurbo: reaching.has(variable.name) }).toEqual({
          name: variable.name,
          inTurbo: true,
        });
      }
    }
  });

  test("only variables that change build output are part of turbo's task hashes", () => {
    // The remote cache shares results between laptops and CI, whose runtime settings differ.
    // A variable belongs in globalEnv only if it changes what a task produces (verified for
    // these by building with different runtime values); everything else is pass-through.
    expect(readTurbo().globalEnv).toEqual(["NODE_ENV", "NEXT_DEPLOYMENT_ID"]);
  });

  test("image variables are set by the service's Dockerfile", () => {
    for (const service of SERVICES) {
      const dockerfile = read(service.dockerfile);
      for (const variable of service.env.filter((candidate) => candidate.kind === "image")) {
        expect(dockerfile).toMatch(new RegExp(`\\b${variable.name}=${variable.value}\\b`));
      }
      if (service.port) expect(dockerfile).toContain(`EXPOSE ${service.port}`);
    }
  });

  test("Fargate limits", () => {
    for (const service of SERVICES) expect(service.stopTimeout).toBeLessThanOrEqual(120);
  });
});

describe("Dockerfiles", () => {
  const pkg = JSON.parse(read("package.json")) as {
    packageManager: string;
    engines: { node: string };
    devDependencies: Record<string, string>;
  };
  const bunVersion = pkg.packageManager.replace(/^bun@/, "");
  const nodeMajor = pkg.engines.node.replace(/^>=/, "");

  for (const service of SERVICES) {
    test(`${service.dockerfile} pins the repo's Bun, Node and turbo`, () => {
      const dockerfile = read(service.dockerfile);
      expect(dockerfile).toContain(`ARG BUN_VERSION=${bunVersion}\n`);
      expect(dockerfile).toContain(`ARG TURBO_VERSION=${pkg.devDependencies.turbo}\n`);
      if (dockerfile.includes("ARG NODE_VERSION")) {
        expect(dockerfile).toContain(`ARG NODE_VERSION=${nodeMajor}\n`);
      }
      expect(dockerfile).toContain("bun install --frozen-lockfile");
      expect(dockerfile).toMatch(/^USER (node|bun)$/m);
    });
  }

  test(".dockerignore keeps env files out of every image", () => {
    const ignored = read(".dockerignore").split("\n");
    for (const pattern of [".env", ".env.*", "**/.env", "**/.env.*", "**/node_modules"]) {
      expect(ignored).toContain(pattern);
    }
  });
});

describe("routing", () => {
  const rules = albListenerRules();

  test("every rule fits the ALB limits and requires CloudFront's origin header", () => {
    for (const rule of rules) {
      const values = rule.conditions.flatMap((condition) =>
        "PathPatternConfig" in condition
          ? condition.PathPatternConfig.Values
          : "HostHeaderConfig" in condition
            ? condition.HostHeaderConfig.Values
            : condition.HttpHeaderConfig.Values,
      );
      // One value to spare: the origin header carries two values while its secret rotates.
      expect(values.length).toBeLessThanOrEqual(4);
      expect(rule.conditions.some((condition) => condition.Field === "http-header")).toBe(true);
    }
    expect(new Set(rules.map((rule) => rule.priority)).size).toBe(rules.length);
  });

  test("the API host first, the dashboard last, site paths in between", () => {
    expect(rules[0]?.targetGroup).toBe("api");
    expect(rules.at(-1)?.targetGroup).toBe("web");
    const sitePaths = rules
      .filter((rule) => rule.targetGroup === "site")
      .flatMap((rule) =>
        rule.conditions.flatMap((condition) =>
          condition.Field === "path-pattern" ? condition.PathPatternConfig.Values : [],
        ),
      );
    expect(sitePaths).toEqual(expect.arrayContaining(["/", "/docs", "/docs/*", "/site-assets/*"]));
    expect(sitePaths).not.toContain("/api/*");
  });

  test("CloudFront caches site paths and hashed assets, never the dashboard or auth", () => {
    const patterns = cossComCacheBehaviours().map((behaviour) => behaviour.pathPattern);
    expect(patterns).toEqual(
      expect.arrayContaining(["/docs/*", "/site-assets/*", "/_next/static/*"]),
    );
    for (const pattern of patterns) expect(pattern.startsWith("/api")).toBe(false);
    expect(patterns).not.toContain("/");
    expect(patterns.length).toBeLessThanOrEqual(25);
  });
});
