# Shared Fonts

This directory contains shared font files used across all apps in the monorepo.

## Usage

Place your font files here (e.g., `CalSansUI[MODE,wght].woff2`), then reference them in each app's layout using a relative path:

```tsx
import localFont from "next/font/local";

const fontSans = localFont({
  src: "../../../public/fonts/CalSansUI[MODE,wght].woff2",
  variable: "--font-sans",
  display: "swap",
});
```

## Paths from each app:

- `apps/ui/app/layout.tsx` → `../../../public/fonts/`
- `apps/origin/app/layout.tsx` → `../../../public/fonts/`
- `apps/www/app/layout.tsx` → `../../../public/fonts/`
- `apps/dashboard/app/layout.tsx` → `../../../public/fonts/`

