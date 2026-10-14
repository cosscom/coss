import { EXAMPLE_GROUPS, EXAMPLES } from "./examples/registry";
import { ExampleThumb } from "./examples/thumbs";
import { Card } from "./ui/card";
import { Chip, Eyebrow, LiveDot } from "./ui/pin";

const pad = (n: number) => String(n).padStart(2, "0");

export function ExampleGallery() {
  return (
    <div className="@container not-prose flex flex-col gap-14">
      {EXAMPLE_GROUPS.map((group, gi) => {
        const items = EXAMPLES.filter((e) => e.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`examples-${group.id}`}>
            <Eyebrow index={pad(gi + 1)}>{group.title.toLowerCase()}</Eyebrow>
            <h2
              id={`examples-${group.id}`}
              className="mt-3 font-heading text-2xl font-semibold tracking-tight"
            >
              {group.title}
            </h2>
            <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{group.lede}</p>
            <ul className="mt-6 grid gap-4 @2xl:grid-cols-2">
              {items.map((e) => (
                <li key={e.slug}>
                  <Card
                    href={`/kloq/docs/examples/${e.slug}`}
                    title={e.title}
                    description={e.description}
                    lead={<LiveDot />}
                    media={<ExampleThumb name={e.slug} />}
                  >
                    {e.uses.slice(0, 4).map((u) => (
                      <Chip key={u}>{u}</Chip>
                    ))}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
