import { createFromSource } from "fumadocs-core/search/server";
import { shipyardSource } from "@/lib/shipyard-docs";

// Shipyard's docs have their own index (SHIPYARD.searchApi, which their layout's SearchProvider
// points at).
export const { GET } = createFromSource(shipyardSource);
