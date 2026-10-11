import { Card, CardDescription, CardHeader, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { formatLegalDate, legalPages } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "The terms, privacy policy, acceptable use policy and data processing addendum for COSS.",
};

export default function LegalIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">Legal</h1>
        <p className="text-muted-foreground">
          COSS is operated by Cal.com, Inc. These documents govern your use of it.
        </p>
      </header>
      <div className="grid gap-4">
        {legalPages().map((page) => (
          <Link className="group" href={page.url} key={page.url}>
            <Card className="transition-colors group-hover:bg-accent/50">
              <CardHeader>
                <CardTitle>{page.data.title}</CardTitle>
                <CardDescription>{page.data.description}</CardDescription>
                <CardDescription className="text-xs">
                  Last updated {formatLegalDate(page.data.lastUpdated)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
