![coss.com](https://github.com/user-attachments/assets/56dfe7f7-85b7-44ee-b89a-1c30c5c4a156)
<h3 align="center">coss.com (formerly Origin UI)</h3>
<p align="center">The <strong>everything but AI</strong> company.</p>

## About the Project

coss.com is the new holding company of [cal.com](https://cal.com), the pioneers of open source scheduling infrastructure. Our mission is to build a home for amazing open source projects, giving them the support they need to grow and succeed.

We're building the coss stack, a one line `npm install @coss` package that includes everything you need to build your application, from email, SMS, calendar, scheduling, video conferencing, notifications and more.

## Repository Overview

This repository contains multiple products and applications that make up the coss.com ecosystem:

### Apps and Packages

- **`apps/www/`** - Main **coss.com** website
- **`apps/origin/`** - Legacy **Origin UI** components (pre-acquisition)
- **`packages/ui/`** - Shared UI components package
- **`packages/eslint-config/`** - ESLint configurations
- **`packages/typescript-config/`** - TypeScript configurations

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Environment Variables

This monorepo contains multiple Next.js applications that are designed to link to each other. For the navigation to work correctly, you must set up environment variables for both local development and production deployments.

#### Local Development

For local development, create a `.env.local` file in each of the app directories with the corresponding variables.

1.  **`www` app**

    This app needs to know the URLs of the other apps. Create a file at `apps/www/.env.local`:

    ```sh
    # apps/www/.env.local
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

2.  **`origin` app**

    This app needs to know the URLs of the other apps. Create a file at `apps/origin/.env.local`:

    ```sh
    # apps/origin/.env.local
    NEXT_PUBLIC_APP_URL=http://localhost:4001/origin
    NEXT_PUBLIC_COSS_URL=http://localhost:3000
    ```

> [!NOTE]
> Turborepo is configured to watch for changes in `.env*` files, so it will automatically invalidate the cache when these variables change.

### Development

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

#### Build

To build all apps and packages:

```sh
pnpm build
```

To build a specific app:

```sh
pnpm build --filter=www
pnpm build --filter=origin
```

#### Develop

To develop all apps and packages:

```sh
pnpm dev
```

To develop a specific app:

```sh
pnpm dev --filter=www
pnpm dev --filter=origin
```

## Licensing

This repository uses a mixed licensing approach. The default license for this project is [AGPLv3.0](LICENSE).

- **MIT**: The `apps/origin/` directory is licensed under its original MIT license
- **AGPLv3**: All other directories are licensed under the GNU Affero General Public License v3.0

For detailed information, see our [Licensing documentation](LICENSING.md).
