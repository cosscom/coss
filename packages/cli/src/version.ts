import pkg from "../package.json" with { type: "json" };

/** The package version (`coss --version`, the forwarded requests' user agent). */
export const VERSION: string = pkg.version;
