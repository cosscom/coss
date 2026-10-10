import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// Indexes MDX pages and API operations alike (both carry structured data).
export const { GET } = createFromSource(source);
