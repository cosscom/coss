import type { Metadata } from "next";
import { DemoCalendar } from "@/components/calendar/demo/demo-calendar";
import { abs, canonical } from "@/lib/calendar/site";

const TITLE = "Live demo - a React calendar you can drag";
const DESCRIPTION =
  "The full coss calendar calendar, backed by localStorage. Drag to create, move and resize events; press ⌥D for design mode. Nothing leaves your browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonical("/calendar/demo"),
  openGraph: { title: TITLE, description: DESCRIPTION, url: abs("/calendar/demo") },
};

/** Static: `?events=` (the stress store) is read on the client, in `DemoCalendar`. */
export default function DemoPage() {
  return <DemoCalendar />;
}
