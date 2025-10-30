# coss ui

**coss ui** is a collection of beautifully designed, accessible, and composable components for your React apps. Built on top of [Base UI](https://base-ui.com/) and styled with [Tailwind CSS](https://tailwindcss.com/), it's designed for you to copy, paste, and own.

We think Base UI is the best foundation for modern web applications. We've taken its powerful, unstyled primitives and given them a design system that's ready to go, right out of the box.

This is the component library we'll be progressively adopting for [cal.com](https://cal.com). We're building it in the open for anyone who wants to create beautiful, reliable user interfaces.

## Contributing

We're always looking for contributors to help improve our UI components. Whether it's a bug report, a new feature, or a documentation update, we appreciate your help.

Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information on how to get involved.

## Getting Started

Run development server:

```sh
pnpm run dev
```

Open http://localhost:4000 with your browser to see the result.

## Development

### Linting

Check for linting errors:

```sh
pnpm run lint
```

Fix linting errors automatically:

```sh
pnpm run lint:fix
```

### Formatting

Check code formatting:

```sh
pnpm run format:check
```

Format code automatically:

```sh
pnpm run format:write
```

### Type Checking

Run TypeScript type checking:

```sh
pnpm run typecheck
```

## Resources

- [Next.JS](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/docs/registry)
- [Fumadocs](https://fumadocs.dev/)

### shadcn/ui Registry

Build shadcn/ui registry:

```sh
pnpm run build:registry
```

This build script compiles all the registry items into a json file that is compatible with both v0 and the shadcn/ui cli. Read the [documentation](https://ui.shadcn.com/docs/registry) for further details.

## License

This project is licensed under the MIT License. See the [LICENSE](../../LICENSING.md) file for details.
