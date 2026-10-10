/** What every server action returns; consumed with `useActionState` and rendered inline. */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
