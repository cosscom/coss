import Link from "next/link";
import type { Competitor } from "@/lib/compare";
import { productBySlug } from "@/lib/marketing";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { JsonLd } from "../json-ld";
import {
  Faq,
  HeroActions,
  LinkGrid,
  MarketingClose,
  MarketingHero,
  Sheet,
} from "../marketing-page";
import { SectionHead } from "../sheet";

/** "2026-10-30" → "October 30, 2026". */
function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/**
 * A comparison (/compare/<slug>), drawn on the catalog's sheet: the verdict, the table side by
 * side, when to choose each, how to move, the FAQ and the sources with the date they were checked.
 * Grayscale like the rest of coss.com: no win/loss colours, the rows speak for themselves.
 */
export function ComparePage({ competitor: c, url }: { competitor: Competitor; url: string }) {
  const products = c.products.flatMap((slug) => {
    const page = productBySlug(slug);
    return page ? [page] : [];
  });
  const lead = products[0];
  const title = `coss.com vs ${c.name}`;
  return (
    <Sheet>
      <JsonLd
        data={articleSchema({ title, description: c.verdict, path: url, modified: c.checked })}
      />
      <JsonLd
        data={breadcrumbSchema([
          ["Compare", "/compare"],
          [title, url],
        ])}
      />
      <JsonLd data={faqSchema(c.faq)} />
      <MarketingHero
        actions={<HeroActions docs={lead?.data.docs ?? "/docs"} />}
        call={lead?.data.call ?? "coss.com"}
        headline={title}
        lede={
          <>
            <p className="text-foreground">{c.verdict}</p>
            <p className="mt-3">{c.lede}</p>
          </>
        }
        mark={lead?.data.mark ?? "keys"}
      />

      <section aria-labelledby="glance-title" className="border-b">
        <SectionHead id="glance-title" title="At a glance">
          <p>
            {c.name}'s side was checked on <time dateTime={c.checked}>{formatDate(c.checked)}</time>{" "}
            against <a href="#sources">its own pages</a>. Prices are list prices.
          </p>
        </SectionHead>
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="w-1/4 px-4 py-4 font-normal text-muted-foreground text-sm sm:px-8">
                  <span className="sr-only">Feature</span>
                </th>
                <th className="w-[37.5%] border-l px-4 py-4 font-semibold sm:px-8" scope="col">
                  coss.com
                </th>
                <th
                  className="w-[37.5%] border-l px-4 py-4 font-semibold text-muted-foreground sm:px-8"
                  scope="col"
                >
                  {c.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr className="border-b align-top last:border-b-0" key={row.label}>
                  <th className="px-4 py-4 font-medium sm:px-8" scope="row">
                    {row.label}
                    {row.note ? (
                      <span className="mt-1 block font-normal text-muted-foreground text-xs">
                        {row.note}
                      </span>
                    ) : null}
                  </th>
                  <td className="border-l px-4 py-4 sm:px-8">{row.coss}</td>
                  <td className="border-l px-4 py-4 text-muted-foreground sm:px-8">{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="choose-title" className="border-b">
        <SectionHead id="choose-title" title="Which to choose">
          <p>Both are good at what they do. Here is where each one fits better.</p>
        </SectionHead>
        <div className="grid grid-cols-1 border-t md:grid-cols-2">
          {(
            [
              [`Choose ${c.name} when`, c.chooseThem],
              ["Choose coss.com when", c.chooseCoss],
            ] as const
          ).map(([heading, items], index) => (
            <div className={index === 0 ? "border-b md:border-r md:border-b-0" : ""} key={heading}>
              <h3 className="border-b px-4 py-5 font-semibold text-2xl tracking-[-0.02em] sm:px-8">
                {heading}
              </h3>
              <ul className="flex flex-col px-4 sm:px-8">
                {items.map((item) => (
                  <li className="border-b py-5 last:border-b-0" key={item.title}>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-muted-foreground leading-snug">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="move-title" className="border-b">
        <SectionHead id="move-title" title={`Moving from ${c.name}`} />
        <ol className="grid border-t md:grid-cols-3">
          {c.migration.map((step, index) => (
            <li
              className="flex flex-col gap-3 border-b px-4 py-8 last:border-b-0 sm:px-8 md:border-r md:border-b-0 md:last:border-r-0"
              key={step.title}
            >
              <span className="flex size-7 items-center justify-center rounded-full border font-mono text-xs">
                {index + 1}
              </span>
              <h3 className="font-semibold text-xl tracking-[-0.01em]">{step.title}</h3>
              <p className="text-muted-foreground leading-snug">{step.body}</p>
              {step.href ? (
                <Link className="font-medium text-sm underline underline-offset-4" href={step.href}>
                  Read the guide
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <Faq faq={c.faq} />

      <section aria-labelledby="sources-title" className="scroll-mt-14 border-b" id="sources">
        <SectionHead id="sources-title" title="Sources">
          <p>
            {c.name}'s facts were checked on{" "}
            <time dateTime={c.checked}>{formatDate(c.checked)}</time>; their pages are the final
            word on their prices and features.
          </p>
        </SectionHead>
        <ul className="border-t px-4 py-6 sm:px-8">
          {c.sources.map((source) => (
            <li className="border-b py-3 last:border-b-0" key={source.href}>
              <a
                className="underline underline-offset-4"
                href={source.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <LinkGrid
        id="products-title"
        links={products.map((page) => ({
          href: page.url,
          title: page.data.title,
          description: page.data.description ?? "",
          mark: page.data.mark,
          call: page.data.call,
        }))}
        title="The coss.com side"
      />
      <MarketingClose title={`Try coss.com next to ${c.name}.`}>
        <p>
          A development key costs nothing and delivers nothing, so you can compare with real code.
        </p>
      </MarketingClose>
    </Sheet>
  );
}
