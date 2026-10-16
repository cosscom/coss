import type { ReactNode } from "react";
import type { PartId } from "./parts";

/** What a block can carry on its top face: a product, or one of the platform pieces they share. */
export type Mark = PartId | "webhooks" | "logs" | "domains" | "keys";

/*
 * Isometric line drawings in the manner of a parts catalog. Geometry is in "catalog units":
 * x runs to the lower right, y to the lower left, z up. Flat artwork (engravings, labels) is drawn in
 * 2D and mapped onto a face with an affine matrix, so it foreshortens like the face does.
 */

const C = Math.cos(Math.PI / 6);
const S = 0.5;

type P3 = readonly [number, number, number];

export function iso([x, y, z]: P3): [number, number] {
  return [(x - y) * C, (x + y) * S - z];
}

function points(corners: readonly P3[]): string {
  return corners
    .map((corner) => {
      const [sx, sy] = iso(corner);
      return `${sx.toFixed(2)},${sy.toFixed(2)}`;
    })
    .join(" ");
}

/** Maps 2D artwork onto the top face at height z, with its origin at (x, y). */
function onTop(x: number, y: number, z: number): string {
  const [tx, ty] = iso([x, y, z]);
  return `matrix(${C} ${S} ${-C} ${S} ${tx} ${ty})`;
}

/** Maps 2D artwork onto the face looking down-left (the plane y = const), origin at its top-left. */
function onLeft(x: number, y: number, z: number): string {
  const [tx, ty] = iso([x, y, z]);
  return `matrix(${C} ${S} 0 1 ${tx} ${ty})`;
}

/** Maps 2D artwork onto the face looking down-right (the plane x = const), origin at its top-left. */
function onRight(x: number, y: number, z: number): string {
  const [tx, ty] = iso([x, y, z]);
  return `matrix(${C} ${-S} 0 1 ${tx} ${ty})`;
}

export interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

const LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinejoin: "round",
  strokeLinecap: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

/** The three visible faces of a box. */
export function Block({ box }: { box: Box }) {
  const { x, y, z, w, d, h } = box;
  const top: P3[] = [
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ];
  const left: P3[] = [
    [x, y + d, z],
    [x + w, y + d, z],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ];
  const right: P3[] = [
    [x + w, y, z],
    [x + w, y + d, z],
    [x + w, y + d, z + h],
    [x + w, y, z + h],
  ];
  return (
    <g>
      <polygon className="fill-(--iso-left)" points={points(left)} {...LINE} fill={undefined} />
      <polygon className="fill-(--iso-right)" points={points(right)} {...LINE} fill={undefined} />
      <polygon className="fill-(--iso-top)" points={points(top)} {...LINE} fill={undefined} />
    </g>
  );
}

/** A square recess cut into a top surface at height z. */
function Socket({
  x,
  y,
  z,
  size,
  depth,
}: {
  x: number;
  y: number;
  z: number;
  size: number;
  depth: number;
}) {
  const floor = z - depth;
  return (
    <g>
      <polygon
        className="fill-(--iso-left)"
        points={points([
          [x, y, floor],
          [x + size, y, floor],
          [x + size, y + size, floor],
          [x, y + size, floor],
        ])}
        {...LINE}
        fill={undefined}
      />
      {/* The two inner walls that face the viewer. */}
      <polygon
        className="fill-(--iso-right)"
        points={points([
          [x, y, z],
          [x + size, y, z],
          [x + size, y, floor],
          [x, y, floor],
        ])}
        {...LINE}
        fill={undefined}
      />
      <polygon
        className="fill-(--iso-left)"
        points={points([
          [x, y, z],
          [x, y + size, z],
          [x, y + size, floor],
          [x, y, floor],
        ])}
        {...LINE}
        fill={undefined}
      />
    </g>
  );
}

/** Each part's mark, drawn in a 92 × 92 square and engraved on its block's top face. */
function Engraving({ part }: { part: Mark }): ReactNode {
  switch (part) {
    case "email":
      return (
        <>
          <rect height={44} rx={3} width={60} x={16} y={24} {...LINE} />
          <path d="M16 27 L46 50 L76 27" {...LINE} />
        </>
      );
    case "sms":
      return (
        <>
          <path
            d="M22 20 H70 a8 8 0 0 1 8 8 V54 a8 8 0 0 1 -8 8 H42 L28 74 V62 H22 a8 8 0 0 1 -8 -8 V28 a8 8 0 0 1 8 -8 Z"
            {...LINE}
          />
          <circle cx={34} cy={41} r={2.5} {...LINE} />
          <circle cx={46} cy={41} r={2.5} {...LINE} />
          <circle cx={58} cy={41} r={2.5} {...LINE} />
        </>
      );
    case "video":
      return (
        <>
          <rect height={40} rx={4} width={50} x={12} y={26} {...LINE} />
          <path d="M62 40 L80 29 V63 L62 52 Z" {...LINE} />
        </>
      );
    case "scheduling":
      return (
        <>
          <rect height={54} rx={4} width={58} x={17} y={22} {...LINE} />
          <path d="M17 36 H75 M31 15 V28 M61 15 V28" {...LINE} />
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect
                height={6}
                key={`${row}-${col}`}
                width={6}
                x={25 + col * 12}
                y={43 + row * 10}
                {...LINE}
                className={row === 1 && col === 2 ? "fill-current" : undefined}
                fill={row === 1 && col === 2 ? undefined : "none"}
              />
            )),
          )}
        </>
      );
    case "webhooks":
      return (
        <>
          <circle cx={46} cy={26} r={8} {...LINE} />
          <circle cx={24} cy={64} r={8} {...LINE} />
          <circle cx={68} cy={64} r={8} {...LINE} />
          <path d="M42 33 L28 57 M50 33 L64 57 M32 64 H60" {...LINE} />
        </>
      );
    case "logs":
      return (
        <>
          <rect height={56} rx={4} width={56} x={18} y={18} {...LINE} />
          <path d="M28 32 H64 M28 42 H56 M28 52 H62 M28 62 H48" {...LINE} />
        </>
      );
    case "domains":
      return (
        <>
          <circle cx={46} cy={46} r={27} {...LINE} />
          <ellipse cx={46} cy={46} rx={11} ry={27} {...LINE} />
          <path d="M19 46 H73 M24 32 H68 M24 60 H68" {...LINE} />
        </>
      );
    case "keys":
      return (
        <>
          <circle cx={32} cy={46} r={13} {...LINE} />
          <circle cx={32} cy={46} r={4} {...LINE} />
          <path d="M45 46 H76 M68 46 V56 M58 46 V53" {...LINE} />
        </>
      );
  }
}

export const MODULE_SIZE = 92;
export const MODULE_HEIGHT = 30;

/** The side label's font size: 9.5, shrunk so long namespaces stay on the face (mono, ~0.62em per glyph). */
function labelSize(text: string): number {
  const room = MODULE_SIZE - 16;
  return Math.min(9.5, room / (text.length * 0.62));
}

/** A product block: its body, its mark on top and its SDK namespace printed on the side. */
export function Module({
  part,
  call,
  x,
  y,
  z,
  stamp = "coss.com",
}: {
  part: Mark;
  call: string;
  x: number;
  y: number;
  z: number;
  /** The maker's mark on the right face. */
  stamp?: string;
}) {
  const box = { x, y, z, w: MODULE_SIZE, d: MODULE_SIZE, h: MODULE_HEIGHT };
  const top = z + MODULE_HEIGHT;
  return (
    <g>
      <Block box={box} />
      <g transform={onTop(x, y, top)}>
        <Engraving part={part} />
      </g>
      <text
        className="fill-current font-mono"
        fontSize={labelSize(call)}
        transform={onLeft(x, y + MODULE_SIZE, top)}
        x={8}
        y={19}
      >
        {call}
      </text>
      <text
        className="fill-current font-mono opacity-60"
        fontSize={8}
        transform={onRight(x + MODULE_SIZE, y + MODULE_SIZE, top)}
        x={8}
        y={19}
      >
        {stamp}
      </text>
    </g>
  );
}

export { Socket };
