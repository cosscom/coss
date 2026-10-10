/** Classifies IP addresses a webhook may not reach (SSRF): anything not public unicast. */
import { isIP } from "node:net";

type V4Range = [network: number, prefix: number];

const BLOCKED_V4: V4Range[] = [
  [0x00000000, 8], // 0.0.0.0/8 "this network"
  [0x0a000000, 8], // 10.0.0.0/8 private
  [0x64400000, 10], // 100.64.0.0/10 carrier-grade NAT
  [0x7f000000, 8], // 127.0.0.0/8 loopback
  [0xa9fe0000, 16], // 169.254.0.0/16 link-local (cloud metadata)
  [0xac100000, 12], // 172.16.0.0/12 private
  [0xc0000000, 24], // 192.0.0.0/24 IETF protocol assignments
  [0xc0000200, 24], // 192.0.2.0/24 documentation
  [0xc0a80000, 16], // 192.168.0.0/16 private
  [0xc6120000, 15], // 198.18.0.0/15 benchmarking
  [0xc6336400, 24], // 198.51.100.0/24 documentation
  [0xcb007100, 24], // 203.0.113.0/24 documentation
  [0xe0000000, 4], // 224.0.0.0/4 multicast
  [0xf0000000, 4], // 240.0.0.0/4 reserved, broadcast
];

function v4ToInt(address: string): number {
  return address.split(".").reduce((value, octet) => value * 256 + Number(octet), 0);
}

function blockedV4(address: string): boolean {
  const value = v4ToInt(address);
  return BLOCKED_V4.some(([network, prefix]) => {
    const size = 2 ** (32 - prefix);
    return value >= network && value < network + size;
  });
}

/** The 8 hextets of an IPv6 address (handles `::` and an embedded IPv4 tail). */
function hextets(address: string): number[] {
  let text = address.toLowerCase().split("%")[0] ?? "";
  const v4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (v4Tail?.[1]) {
    const value = v4ToInt(v4Tail[1]);
    text = `${text.slice(0, -v4Tail[1].length)}${(value >>> 16).toString(16)}:${(value & 0xffff).toString(16)}`;
  }
  const [head = "", tail] = text.split("::");
  const parse = (part: string) => (part ? part.split(":").map((h) => Number.parseInt(h, 16)) : []);
  const left = parse(head);
  const right = tail === undefined ? [] : parse(tail);
  const fill = tail === undefined ? [] : new Array(8 - left.length - right.length).fill(0);
  return [...left, ...fill, ...right];
}

function blockedV6(address: string): boolean {
  const h = hextets(address);
  const [a = 0, b = 0, , , , f = 0, g = 0, last = 0] = h;
  const embeddedV4 = `${g >>> 8}.${g & 0xff}.${last >>> 8}.${last & 0xff}`;
  if (h.slice(0, 7).every((x) => x === 0) && (last === 0 || last === 1)) return true; // :: and ::1
  if (h.slice(0, 5).every((x) => x === 0) && f === 0xffff) return blockedV4(embeddedV4); // mapped
  if (a === 0x64 && b === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return blockedV4(embeddedV4); // NAT64 64:ff9b::/96
  }
  if ((a & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((a & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((a & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (a === 0x2001 && b === 0x0db8) return true; // 2001:db8::/32 documentation
  if (a === 0x0100 && h.slice(1, 4).every((x) => x === 0)) return true; // 100::/64 discard
  return false;
}

/** True for loopback, private, link-local, multicast and other non-public addresses. */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return blockedV4(address);
  if (version === 6) return blockedV6(address);
  return true;
}
