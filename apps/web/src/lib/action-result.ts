/** What every server action returns; consumed with `useActionToast` (`./toast`). */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
