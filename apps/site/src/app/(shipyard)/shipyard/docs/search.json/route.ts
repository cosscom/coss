import { createFromSource } from "fumadocs-core/search/server";
import { shipyardSource } from "@/lib/shipyard-docs";

// Shipyard's docs have their own index (SHIPYARD.searchApi, which their shell's command menu
// searches).
export const { GET } = createFromSource(shipyardSource);
