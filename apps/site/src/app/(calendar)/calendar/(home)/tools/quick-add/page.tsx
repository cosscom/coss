import type { Metadata } from "next";
import { JsonLd } from "@/components/calendar/seo/json-ld";
import { QuickAddParser } from "@/components/calendar/tools/quick-add-parser";
import { ToolShell } from "@/components/calendar/tools/tool-shell";
import { abs, canonical } from "@/lib/calendar/site";
import { toolSchema } from "@/lib/calendar/structured-data";
import { toolOf } from "@/lib/calendar/tools";

const tool = toolOf("quick-add");

export const metadata: Metadata = {
  title: { absolute: tool.title },
  description: tool.description,
  alternates: canonical(`/calendar/tools/${tool.slug}`),
  openGraph: {
    title: tool.title,
    description: tool.description,
    url: abs(`/calendar/tools/${tool.slug}`),
  },
  twitter: { card: "summary_large_image", title: tool.title, description: tool.description },
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolSchema({ name: tool.name, description: tool.description, slug: tool.slug })}
      />
      <ToolShell tool={tool}>
        <QuickAddParser />
      </ToolShell>
    </>
  );
}
