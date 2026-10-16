import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { hubProfile, user } from "@/db/schema";

/**
 * An account's avatar: the one uploaded in onboarding, else the sign-in provider's picture,
 * fetched here and served from the hub (its CSP allows no third-party image origin).
 */
const proxied = new Map<string, { body: ArrayBuffer; type: string; at: number }>();
const PROXY_TTL_MS = 60 * 60_000;

export async function GET(_request: Request, { params }: RouteContext<"/a/[handle]">) {
  const { handle } = await params;
  const [row] = await db
    .select({
      avatar: hubProfile.avatar,
      type: hubProfile.avatarType,
      image: user.image,
      userId: hubProfile.userId,
    })
    .from(hubProfile)
    .innerJoin(user, eq(user.id, hubProfile.userId))
    .where(eq(hubProfile.handle, handle.toLowerCase()))
    .limit(1);
  const headers = { "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" };
  if (row?.avatar) {
    return new Response(new Uint8Array(row.avatar), {
      headers: { ...headers, "Content-Type": row.type ?? "image/jpeg" },
    });
  }
  const image = row?.image;
  if (
    !image ||
    !/^https:\/\/(avatars\.githubusercontent\.com|lh3\.googleusercontent\.com)\//.test(image)
  ) {
    return new Response("Not found", { status: 404 });
  }
  const cached = proxied.get(image);
  if (cached && Date.now() - cached.at < PROXY_TTL_MS) {
    return new Response(cached.body, { headers: { ...headers, "Content-Type": cached.type } });
  }
  const upstream = await fetch(image, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!upstream?.ok) return new Response("Not found", { status: 404 });
  const type = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });
  const body = await upstream.arrayBuffer();
  proxied.set(image, { body, type, at: Date.now() });
  return new Response(body, { headers: { ...headers, "Content-Type": type } });
}
