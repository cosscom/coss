import pkg from "../package.json" with { type: "json" };

/** The package version, sent as the server's version and in the SDK's user agent. */
export const VERSION: string = pkg.version;
