import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.server = { ...config.server, allowedHosts: true };
    // Resolve @ alias to apps/origin (one level up from .storybook/)
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      "@": path.resolve(__dirname, ".."),
      "next-themes": path.resolve(__dirname, "mocks/next-themes.ts"),
      "shadcn/tailwind.css": path.resolve(
        __dirname,
        "../node_modules/shadcn/tailwind.css"
      ),
    };

    // Polyfill process.env for Next.js internals in Vite browser bundles
    config.define = {
      ...config.define,
      "process.env": JSON.stringify({}),
    };

    // PostCSS with Tailwind v4
    config.css = config.css ?? {};
    config.css.postcss = {
      plugins: [(await import("@tailwindcss/postcss")).default],
    };

    return config;
  },
};

export default config;
