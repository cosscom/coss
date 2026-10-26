/**
 * What `coss init` can see of the project, so its closing message points at the drop-in that
 * project already uses. Detection only reads files; it never installs anything.
 */
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PackageDeps {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

export interface ProjectDriver {
  kind: "laravel" | "rails" | "django";
  /** Printed for the user to run. `coss init` does not execute it. */
  install: string;
}

export interface DetectedStack {
  /** A Next.js app: the env file is `.env.local`, and server code is a route or an action. */
  next: boolean;
  /** A `package.json` is here, so the `coss` package can be installed. */
  javascript: boolean;
  integration: "nodemailer" | "better-auth" | "authjs" | null;
  driver: ProjectDriver | null;
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function dependsOn(pkg: PackageDeps, name: string): boolean {
  return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

async function detectDriver(dir: string): Promise<ProjectDriver | null> {
  const composer = await readOptional(join(dir, "composer.json"));
  if (composer?.includes('"laravel/framework"')) {
    return { kind: "laravel", install: "composer require coss/laravel" };
  }
  const gemfile = await readOptional(join(dir, "Gemfile"));
  if (gemfile && /^\s*gem\s+["']rails["']/m.test(gemfile)) {
    return { kind: "rails", install: "bundle add coss-rails" };
  }
  const manage = await readOptional(join(dir, "manage.py"));
  const pyproject = await readOptional(join(dir, "pyproject.toml"));
  const requirements = await readOptional(join(dir, "requirements.txt"));
  const django =
    (manage?.includes("django") ?? false) ||
    /\bdjango\b/i.test(pyproject ?? "") ||
    /\bdjango\b/i.test(requirements ?? "");
  if (!django) return null;
  const uv = (await exists(join(dir, "uv.lock"))) || (pyproject?.includes("[tool.uv]") ?? false);
  return { kind: "django", install: uv ? "uv add coss-django" : "pip install coss-django" };
}

/** The mail library or framework driver in `dir`, if one is there. */
export async function detectProjectStack(
  dir: string,
  pkg: PackageDeps | null,
): Promise<DetectedStack> {
  let integration: DetectedStack["integration"] = null;
  if (pkg && dependsOn(pkg, "nodemailer")) integration = "nodemailer";
  else if (pkg && dependsOn(pkg, "better-auth")) integration = "better-auth";
  else if (pkg && (dependsOn(pkg, "next-auth") || dependsOn(pkg, "@auth/core"))) {
    integration = "authjs";
  }
  return {
    next: pkg !== null && dependsOn(pkg, "next"),
    javascript: pkg !== null,
    integration,
    driver: await detectDriver(dir),
  };
}
