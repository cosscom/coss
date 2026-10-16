/**
 * GitHub's contribution graph, counting prompts that reached production instead of commits.
 * Deterministic from a seed (the prototype has no per-day history), grayscale by intensity.
 */
export function ContributionGraph({
  seed,
  total,
  weeks = 52,
}: {
  seed: string;
  total: number;
  weeks?: number;
}) {
  let state = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    state = (state * 1_103_515_245 + 12_345) >>> 0;
    return (state >>> 8) / 0x01_00_00_00;
  };
  // Nothing shipped yet: an empty year, not an invented one.
  const perDay = total === 0 ? 0 : Math.max(1, total / 365);
  const days = Array.from({ length: weeks * 7 }, (_, index) => {
    const weekday = index % 7;
    const weekend = weekday === 0 || weekday === 6;
    const r = rand();
    const count =
      perDay === 0 || r < (weekend ? 0.55 : 0.18) ? 0 : Math.round(perDay * (0.3 + r * 1.6));
    return count;
  });
  const max = Math.max(1, ...days);
  const level = (count: number) =>
    count === 0 ? 0 : Math.min(4, 1 + Math.floor((count / max) * 4));
  const shade = [
    "bg-foreground/6",
    "bg-foreground/22",
    "bg-foreground/40",
    "bg-foreground/64",
    "bg-foreground",
  ];
  const sum = days.reduce((a, b) => a + b, 0);
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
      >
        {days.map((count, index) => (
          <span
            className={`size-2.5 rounded-[2px] ${shade[level(count)]}`}
            key={`${seed}-${index.toString()}`}
            title={`${count} prompts to production`}
          />
        ))}
      </div>
      <figcaption className="flex items-center justify-between text-muted-foreground text-xs">
        <span>
          {new Intl.NumberFormat("en-US").format(sum)} prompts to production in the last year
        </span>
        <span className="flex items-center gap-1">
          Less
          {shade.map((s) => (
            <span className={`size-2.5 rounded-[2px] ${s}`} key={s} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
