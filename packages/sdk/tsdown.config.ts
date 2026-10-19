import { defineConfig } from "tsdown";

export default defineConfig({
  // `coss/device` runs in browsers only; the integrations (`coss/nodemailer`, `coss/better-auth`,
  // `coss/authjs`) and `coss/diagnose` are their own entries so `coss` never carries them.
  entry: [
    "src/index.ts",
    "src/device.ts",
    "src/diagnose.ts",
    "src/nodemailer.ts",
    "src/better-auth.ts",
    "src/authjs.ts",
  ],
  format: "esm",
  // No Node built-ins or shims: the output must run unchanged on Node, Bun, Deno and Workers.
  platform: "neutral",
  target: "es2022",
  // oxc emits declarations straight from source; it relies on `isolatedDeclarations` (tsconfig).
  dts: { generator: "oxc" },
  // Rewrites package.json `exports`. `legacy` keeps main/module/types so the committed file is
  // identical after every build.
  exports: { legacy: true },
  publint: true,
  attw: { profile: "esm-only", level: "error" },
  clean: true,
});
