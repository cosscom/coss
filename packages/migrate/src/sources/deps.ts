import type { HttpDeps } from "../http.ts";

/** Downloads an export file (SendGrid's contact exports). */
export type Downloader = (url: string) => Promise<Uint8Array>;

/** Providers' hosts are constants, never customer input; tests replace `fetch`. */
export type SourceDeps = HttpDeps & {
  download?: Downloader | undefined;
};
