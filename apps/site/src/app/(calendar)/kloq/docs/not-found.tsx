import { Button } from "@coss/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { NotFoundContent } from "@/components/calendar/site/not-found-content";
import { CALENDAR } from "@/lib/calendar";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <NotFoundContent
      actions={
        <>
          <Button render={<Link href={CALENDAR.docs} />}>Docs home</Button>
          <Button render={<Link href={`${CALENDAR.docs}/quick-start`} />} variant="outline">
            Quick start
          </Button>
        </>
      }
    />
  );
}
