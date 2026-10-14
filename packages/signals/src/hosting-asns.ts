/**
 * Autonomous systems that are data centers rather than people's connections, for providers whose
 * address ranges aren't covered by a published list (`./datasets.ts`). Hand-curated and
 * conservative: an entry here makes every address of that network count as `ip.hosting_provider`.
 * Add one only with evidence (the AS's own description, PeeringDB "Content"/"Hosting" type), and
 * never an access network (ISPs, mobile carriers) or a network shared with consumers (Cloudflare's
 * AS13335 also carries WARP users; Google's AS15169 its consumer services).
 */
export type HostingKind = "cloud" | "hosting" | "vpn";

export const HOSTING_ASNS: ReadonlyMap<number, { name: string; kind: HostingKind }> = new Map([
  // Cloud providers (their published ranges are preferred; these catch the rest).
  [16509, { name: "aws", kind: "cloud" }],
  [14618, { name: "aws", kind: "cloud" }],
  [396982, { name: "gcp", kind: "cloud" }],
  [8075, { name: "azure", kind: "cloud" }],
  [31898, { name: "oracle", kind: "cloud" }],
  [14061, { name: "digitalocean", kind: "cloud" }],
  [45102, { name: "alibaba", kind: "cloud" }],
  [37963, { name: "alibaba", kind: "cloud" }],
  [132203, { name: "tencent", kind: "cloud" }],
  [45090, { name: "tencent", kind: "cloud" }],
  // Hosting and VPS providers.
  [24940, { name: "hetzner", kind: "hosting" }],
  [213230, { name: "hetzner", kind: "hosting" }],
  [212317, { name: "hetzner", kind: "hosting" }],
  [16276, { name: "ovh", kind: "hosting" }],
  [63949, { name: "linode", kind: "hosting" }],
  [20473, { name: "vultr", kind: "hosting" }],
  [51167, { name: "contabo", kind: "hosting" }],
  [12876, { name: "scaleway", kind: "hosting" }],
  [60781, { name: "leaseweb", kind: "hosting" }],
  [28753, { name: "leaseweb", kind: "hosting" }],
  [30633, { name: "leaseweb", kind: "hosting" }],
  [197540, { name: "netcup", kind: "hosting" }],
  [47583, { name: "hostinger", kind: "hosting" }],
  [36352, { name: "colocrossing", kind: "hosting" }],
  [8100, { name: "quadranet", kind: "hosting" }],
  [53667, { name: "frantech", kind: "hosting" }],
  [19318, { name: "interserver", kind: "hosting" }],
  [54290, { name: "hostwinds", kind: "hosting" }],
  [199524, { name: "gcore", kind: "hosting" }],
  // Networks mostly used as egress by commercial VPN and proxy services.
  [9009, { name: "m247", kind: "vpn" }],
  [60068, { name: "datacamp", kind: "vpn" }],
  [212238, { name: "datacamp", kind: "vpn" }],
]);
