export default {
  "**/*.{js,ts,jsx,tsx,md,mdx,json}": (files) =>
    `bunx biome check --write --no-errors-on-unmatched ${files.join(" ")}`,
}
