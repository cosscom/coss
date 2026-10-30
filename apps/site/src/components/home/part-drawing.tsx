import { iso, type Mark, MODULE_HEIGHT, MODULE_SIZE, Module } from "./iso";

/** One product's block on its own, as drawn in its catalog entry and on its product page. */
export function PartDrawing({
  part,
  call,
  className,
}: {
  part: Mark;
  /** The SDK namespace printed on its side. */
  call: string;
  className?: string;
}) {
  // Frame the block: its leftmost, rightmost, highest and lowest projected corners.
  const [left] = iso([0, MODULE_SIZE, 0]);
  const [right] = iso([MODULE_SIZE, 0, 0]);
  const [, top] = iso([0, 0, MODULE_HEIGHT]);
  const [, bottom] = iso([MODULE_SIZE, MODULE_SIZE, 0]);
  const pad = 10;
  return (
    <svg
      aria-hidden
      className={className}
      viewBox={`${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`}
    >
      <g className="text-foreground">
        <Module call={call} part={part} x={0} y={0} z={0} />
      </g>
    </svg>
  );
}
