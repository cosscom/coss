/**
 * Test helpers: `buildTestMmdb` writes a small MaxMind DB (IPv6 tree, IPv4 under `::/96`) with the
 * given networks, in the shape of IPinfo Lite, so tests exercise the real reader.
 */
import { parseCidr } from "./ip.ts";

type MmdbValue = string | number | Record<string, unknown> | string[];

function control(type: number, size: number): number[] {
  // Types above 7 are "extended": type 0 in the control byte, then (type - 7) in the next byte.
  if (size >= 29) throw new Error("buildTestMmdb only encodes short values");
  return type <= 7 ? [(type << 5) | size] : [size, type - 7];
}

function encode(value: MmdbValue, type?: "uint16" | "uint32" | "uint64"): number[] {
  if (typeof value === "string") {
    const bytes = [...new TextEncoder().encode(value)];
    return [...control(2, bytes.length), ...bytes];
  }
  if (typeof value === "number") {
    const width = type === "uint16" ? 2 : type === "uint64" ? 8 : 4;
    const bytes: number[] = [];
    let rest = BigInt(value);
    while (rest > 0n) {
      bytes.unshift(Number(rest & 0xffn));
      rest >>= 8n;
    }
    if (bytes.length > width) throw new Error("number too large");
    const typeId = type === "uint16" ? 5 : type === "uint64" ? 9 : 6;
    return [...control(typeId, bytes.length), ...bytes];
  }
  if (Array.isArray(value)) {
    return [...control(11, value.length), ...value.flatMap((item) => encode(item))];
  }
  const entries = Object.entries(value);
  return [
    ...control(7, entries.length),
    ...entries.flatMap(([key, item]) => [...encode(key), ...encode(item as MmdbValue)]),
  ];
}

type TrieNode = { children: [TrieNode | number | null, TrieNode | number | null] };

/** An IPinfo-Lite-shaped MMDB: `{ asn: "AS123", as_name, as_domain, country_code }` per network. */
export function buildTestMmdb(
  networks: { cidr: string; asn: number; name?: string; domain?: string; country?: string }[],
): Uint8Array<ArrayBuffer> {
  const data: number[] = [];
  const root: TrieNode = { children: [null, null] };
  for (const network of networks) {
    const parsed = parseCidr(network.cidr);
    if (!parsed) throw new Error(`bad CIDR ${network.cidr}`);
    const offset = data.length;
    data.push(
      ...encode({
        asn: `AS${network.asn}`,
        ...(network.name ? { as_name: network.name } : {}),
        ...(network.domain ? { as_domain: network.domain } : {}),
        ...(network.country ? { country_code: network.country } : {}),
      }),
    );
    // IPv4 networks live under ::/96 in an IPv6 tree.
    const bits = parsed.version === 4 ? 96 + parsed.prefix : parsed.prefix;
    let node = root;
    for (let i = 0; i < bits; i++) {
      const bit = Number((parsed.start >> BigInt(127 - i)) & 1n) as 0 | 1;
      if (i === bits - 1) {
        node.children[bit] = offset;
        break;
      }
      let next = node.children[bit];
      if (typeof next !== "object" || next === null) {
        next = { children: [null, null] };
        node.children[bit] = next;
      }
      node = next;
    }
  }
  // Number the nodes breadth-first.
  const nodes: TrieNode[] = [];
  const queue: TrieNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift() as TrieNode;
    nodes.push(node);
    for (const child of node.children) if (child && typeof child === "object") queue.push(child);
  }
  const index = new Map(nodes.map((node, i) => [node, i]));
  const nodeCount = nodes.length;
  const tree: number[] = [];
  for (const node of nodes) {
    for (const child of node.children) {
      const record =
        child === null
          ? nodeCount
          : typeof child === "number"
            ? nodeCount + 16 + child
            : (index.get(child) as number);
      tree.push(
        (record >>> 24) & 0xff,
        (record >>> 16) & 0xff,
        (record >>> 8) & 0xff,
        record & 0xff,
      );
    }
  }
  // Metadata integers need their exact MMDB types.
  const metadata = [
    ...control(7, 9),
    ...encode("node_count"),
    ...encode(nodeCount, "uint32"),
    ...encode("record_size"),
    ...encode(32, "uint16"),
    ...encode("ip_version"),
    ...encode(6, "uint16"),
    ...encode("database_type"),
    ...encode("ipinfo_lite"),
    ...encode("languages"),
    ...encode(["en"]),
    ...encode("binary_format_major_version"),
    ...encode(2, "uint16"),
    ...encode("binary_format_minor_version"),
    ...encode(0, "uint16"),
    ...encode("build_epoch"),
    ...encode(1_700_000_000, "uint64"),
    ...encode("description"),
    ...encode({ en: "COSS test database" }),
  ];
  const marker = [0xab, 0xcd, 0xef, ...new TextEncoder().encode("MaxMind.com")];
  return Uint8Array.from([...tree, ...new Array(16).fill(0), ...data, ...marker, ...metadata]);
}
