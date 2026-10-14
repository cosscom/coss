# Shared Fonts

This directory contains shared font files and configurations used across all apps in the monorepo.

## Usage

Import fonts directly from the shared UI package:

```tsx
import { fontMono, fontSans } from "@coss/ui/fonts";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
```

`--font-heading` is aliased to `--font-sans` in the theme (`--font-heading: var(--font-sans)`). Apply the `font-heading` class on titles and headings, with `font-bold` or `font-semibold` as needed.

## Available Fonts

- `fontSans` — Cal Sans 2.010 variable font (`CalSansVF.woff2` upright, `CalSansVF-Italic.woff2` italic)
- `fontHeading` — Alias of `fontSans`; use when wiring a separate `--font-heading` variable
- `fontMono` — Paper Mono for code and monospace UI
- `fontCalSans` — The upright Cal Sans alone as `--font-cal-sans`, for a page that keeps its own body sans (Shipyard's landing page)

`CalSansVF.woff2` is the `calsans-cossui` build (licence: `OFL.txt`); the italic is the upstream build.

## Separate heading font

To use a different family for headings, set `--font-heading` in your layout and point the theme token at it:

```tsx
import { fontHeading, fontMono, fontSans } from "@coss/ui/fonts";

<body className={`${fontSans.variable} ${fontHeading.variable} ${fontMono.variable} font-sans`}>
```

```css
@theme inline {
  --font-heading: var(--font-heading);
}
```

## Adding New Fonts

1. Place the font file in this directory (`packages/ui/src/fonts/`)
2. Add a new font configuration in `index.ts`:

```typescript
export const yourNewFont = localFont({
  display: "swap",
  src: "./YourFont.woff2",
  variable: "--font-your-name",
});
```

3. Use it in any app by importing from `@coss/ui/fonts`

## Benefits of This Approach

- Single source of truth for fonts
- No fragile relative paths
- Type-safe imports
- Versioned with the UI package
- Easy to update across all apps
