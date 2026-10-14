import type { Metadata } from "next";
import { NotFoundContent } from "@/components/calendar/site/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <NotFoundContent />
    </main>
  );
}
