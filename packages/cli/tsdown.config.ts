import { defineConfig } from "tsdown";

export default defineConfig({
  // `coss` (the bin) and the library it is built from (`run`, for tests and embedding).
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  // Runs on Node (loopback server, config file); the SDK stays external and is installed with it.
  platform: "node",
  target: "node22",
  // `.js`, as `type: module` makes it ESM (tsdown defaults to `.mjs` on Node).
  fixedExtension: false,
  // oxc emits declarations straight from source; it relies on `isolatedDeclarations` (tsconfig).
  dts: { generator: "oxc" },
  publint: true,
  attw: { profile: "esm-only", level: "error" },
  clean: true,
});
