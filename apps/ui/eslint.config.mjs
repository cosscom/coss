import { nextJsConfig } from "@coss/eslint-config/next";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".source/**",      
    ]
  }
];
