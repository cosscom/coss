/**
 * POSTs to a Better Auth endpoint (`/sign-out`, `/admin/stop-impersonating`) without the auth
 * client: importing it eagerly puts every plugin on every page, and importing it on click needs a
 * chunk that a tab opened before a deploy may no longer find.
 */
export async function postAuth(path: `/${string}`): Promise<{ error: string | null }> {
  try {
    const response = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (response.ok) return { error: null };
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    return {
      error:
        typeof body?.message === "string" ? body.message : `Request failed (${response.status}).`,
    };
  } catch {
    return { error: "Couldn't reach COSS. Check your connection and try again." };
  }
}
