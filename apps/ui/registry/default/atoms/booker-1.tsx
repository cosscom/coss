"use client";

import { useEffect, useState } from "react";
import { fetchEventTypeAction } from "@/lib/booker/actions";

type BookerProps = {
  username: string;
  eventSlug: string;
};

export default function Booker({ username, eventSlug }: BookerProps) {
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventTypeAction({ eventSlug, username }).then((result) => {
      if (result.ok) {
        setTitle(result.eventType.title);
        return;
      }

      setError(result.error);
    });
  }, [eventSlug, username]);

  if (error) {
    return <p className="text-muted-foreground text-sm">{error}</p>;
  }

  if (!title) {
    return <p className="text-muted-foreground text-sm">Loading event type…</p>;
  }

  return <h1 className="font-heading font-semibold text-xl">{title}</h1>;
}
