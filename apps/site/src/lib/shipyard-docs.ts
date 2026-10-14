import "server-only";
import { loader } from "fumadocs-core/source";
import { shipyard } from "./collections";
import { SHIPYARD } from "./shipyard";

/**
 * Shipyard's docs (content/shipyard) at /shipyard/docs. Their own source, so they stay out of
 * coss's docs sidebar, search (/shipyard/docs/search.json is theirs) and /llms.txt.
 */
export const shipyardSource = loader({
  source: shipyard.toFumadocsSource(),
  baseUrl: SHIPYARD.docs,
});

export type ShipyardPage = NonNullable<ReturnType<typeof shipyardSource.getPage>>;
