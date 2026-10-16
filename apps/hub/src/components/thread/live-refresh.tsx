"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** While the factory works, re-read the thread every few seconds so its updates show up. */
export function LiveRefresh({ every = 4000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), every);
    return () => clearInterval(id);
  }, [router, every]);
  return null;
}
