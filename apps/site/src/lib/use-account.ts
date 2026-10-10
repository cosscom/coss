"use client";
import { useEffect, useState } from "react";

export type Account =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; name: string };

const SIGNED_OUT: Account = { status: "signed-out" };
let pending: Promise<Account> | undefined;

/**
 * Whether the visitor is signed in to the dashboard, from Better Auth's session endpoint (the
 * cookie is HttpOnly, so it can't be read directly). Fetched once per page load and shared, so
 * pages stay static.
 */
export function useAccount(): Account {
  const [account, setAccount] = useState<Account>({ status: "loading" });
  useEffect(() => {
    let active = true;
    pending ??= loadAccount().catch(() => SIGNED_OUT);
    void pending.then((value) => {
      if (active) setAccount(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return account;
}

/** Exported for tests. */
export async function loadAccount(): Promise<Account> {
  const session = await getJson<{ user?: { name?: string } } | null>("/api/auth/get-session");
  if (!session?.user) return SIGNED_OUT;
  return { status: "signed-in", name: session.user.name ?? "" };
}

async function getJson<T>(path: string): Promise<T | null> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  return response.ok ? ((await response.json()) as T) : null;
}
