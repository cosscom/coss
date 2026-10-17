import type { CSSProperties, ReactNode } from "react";
import { iso } from "@/components/home/iso";

/*
 * Shipyard's landing page drawings: isometric line art in the catalog's manner (see iso.tsx), with
 * Shipyard's one amber lamp. Faces, bars and labels are classes styled by the page's landing.css,
 * so light and dark come from the site's tokens. Every part sits in a `.part` group that drops in
 * when its drawing scrolls into view (`--i` staggers it, see stage.tsx), and the groups marked
 * `.lift` rise when the drawing is hovered.
 */

type Pt = readonly [number, number];
type Origin = Pt;

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const round = (n: number) => Math.round(n * 10) / 10;

/** A point in catalog units, drawn from the screen origin `o`. */
function at(o: Origin, x: number, y: number, z: number): Pt {
  const [sx, sy] = iso([x, y, z]);
  return [round(o[0] + sx), round(o[1] + sy)];
}

const points = (pts: Pt[]) => pts.map((p) => p.join(",")).join(" ");
const segment = (a: Pt, b: Pt) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
const middle = (a: Pt, b: Pt, dy = 0): Pt => [
  round((a[0] + b[0]) / 2),
  round((a[1] + b[1]) / 2 + dy),
];

/** A part that drops in, `i`-th in its drawing. */
function Part({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <g className={className ? `part ${className}` : "part"} style={{ "--i": i } as CSSProperties}>
      {children}
    </g>
  );
}

function Lift({ children, className }: { children: ReactNode; className?: string }) {
  return <g className={className ? `lift ${className}` : "lift"}>{children}</g>;
}

/** The three visible faces of a box. */
function Box({
  o,
  x,
  y,
  z,
  w,
  d,
  h,
  className,
}: {
  o: Origin;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  className?: string;
}) {
  const x1 = x + w;
  const y1 = y + d;
  const z1 = z + h;
  return (
    <g className={className}>
      <polygon
        className="face l"
        points={points([at(o, x, y1, z), at(o, x1, y1, z), at(o, x1, y1, z1), at(o, x, y1, z1)])}
      />
      <polygon
        className="face r"
        points={points([at(o, x1, y1, z), at(o, x1, y, z), at(o, x1, y, z1), at(o, x1, y1, z1)])}
      />
      <polygon
        className="face t"
        points={points([at(o, x, y, z1), at(o, x1, y, z1), at(o, x1, y1, z1), at(o, x, y1, z1)])}
      />
    </g>
  );
}

/** A shape lying on a top face at height z. */
function Flat({
  o,
  x,
  y,
  z,
  w,
  d,
  className,
}: {
  o: Origin;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  className: string;
}) {
  return (
    <polygon
      className={className}
      points={points([
        at(o, x, y, z),
        at(o, x + w, y, z),
        at(o, x + w, y + d, z),
        at(o, x, y + d, z),
      ])}
    />
  );
}

/** A shape standing on a left face (the plane y = const). */
function Upright({
  o,
  x,
  y,
  z,
  w,
  h,
  className,
}: {
  o: Origin;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  className: string;
}) {
  return (
    <polygon
      className={className}
      points={points([
        at(o, x, y, z),
        at(o, x + w, y, z),
        at(o, x + w, y, z + h),
        at(o, x, y, z + h),
      ])}
    />
  );
}

type Tone = "ink" | "line" | "dim" | "soft" | "red" | "green" | "amber";

/** A bar of "text" on a face, along x, along y, or up a standing face. */
function Bar({ from, to, tone, width = 3 }: { from: Pt; to: Pt; tone: Tone; width?: number }) {
  return <path className={`bar ${tone}`} d={segment(from, to)} strokeWidth={width} />;
}

type TextTone = "ink" | "muted" | "red" | "green";

/** Words printed on a face: the top (along x), the left face or the right face. */
function Print({
  o,
  x,
  y,
  z,
  on,
  size = 10,
  tone = "muted",
  children,
}: {
  o: Origin;
  x: number;
  y: number;
  z: number;
  /** `across` runs over the top face the other way (along −y), reading up and to the right. */
  on: "top" | "across" | "left" | "right";
  size?: number;
  tone?: TextTone;
  children: ReactNode;
}) {
  const [tx, ty] = at(o, x, y, z);
  const m = {
    top: `${C} ${S} ${-C} ${S}`,
    across: `${C} ${-S} ${C} ${S}`,
    left: `${C} ${S} 0 1`,
    right: `${C} ${-S} 0 1`,
  }[on];
  return (
    <text className={`print ${tone}`} fontSize={size} transform={`matrix(${m} ${tx} ${ty})`}>
      {children}
    </text>
  );
}

/** Flat words beside the drawing. */
function Caption({
  p,
  size = 10,
  anchor = "middle",
  children,
}: {
  p: Pt;
  size?: number;
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text className="print muted" fontSize={size} textAnchor={anchor} x={p[0]} y={p[1]}>
      {children}
    </text>
  );
}

/** Shipyard's amber lamp: lit, with a glow that breathes. */
function Lamp({ p, r = 3.5 }: { p: Pt; r?: number }) {
  return (
    <g className="lamp">
      <circle className="glow" cx={p[0]} cy={p[1]} r={round(r * 2.6)} />
      <circle className="dot" cx={p[0]} cy={p[1]} r={r} />
    </g>
  );
}

/** A dashed connection; its dashes march. */
function Wire({ a, b, quiet }: { a: Pt; b: Pt; quiet?: boolean }) {
  return <path className={quiet ? "wire quiet" : "wire"} d={segment(a, b)} />;
}

function Drawing({
  name,
  viewBox,
  title,
  className,
  children,
}: {
  name: string;
  viewBox: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={`sy-iso sy-iso-${name}${className ? ` ${className}` : ""}`}
      role="img"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** The hero: a closed laptop, linked over ssh to a tray of boxes running agents. */
export function FleetDrawing({ className }: { className?: string }) {
  const L: Origin = [355, 238];
  const T: Origin = [785, 148];
  const led = at(L, 166, 124, 7);
  const a = at(L, 180, 62, 7);
  const b = at(T, 0, 176, 10);
  const boxes = [
    { x: 24, name: "devl", sub: "2 working", on: true },
    { x: 176, name: "gpu", sub: "1 working", on: true },
    { x: 328, name: "old-vps", sub: "offline", on: false },
  ];
  return (
    <Drawing
      className={className}
      name="fleet"
      title="A closed laptop linked over ssh to a tray of boxes: devl and gpu are lit and working, old-vps is offline."
      viewBox="20 70 1400 450"
    >
      <Part i={0}>
        <Box d={124} h={14} o={L} w={180} x={0} y={0} z={0} />
        <Box d={120} h={7} o={L} w={174} x={3} y={2} z={14} />
        <g className="zz">
          <Print o={L} on="top" size={15} x={58} y={50} z={21}>
            z z z
          </Print>
        </g>
        <circle className="led" cx={led[0]} cy={led[1]} r={2} />
      </Part>
      <Part i={1}>
        <Box className="tray" d={176} h={20} o={T} w={470} x={0} y={0} z={0} />
        <Print o={T} on="left" x={14} y={176} z={6}>
          berthd on each box
        </Print>
        <Print o={T} on="right" x={470} y={164} z={6}>
          coss.shipyard
        </Print>
      </Part>
      {boxes.map((box, n) => {
        const z = 90;
        const gx = box.x + 22;
        const gy = 40;
        return (
          <Part className={box.on ? "host" : "host off"} i={2 + n} key={box.name}>
            <Lift>
              <Box d={128} h={70} o={T} w={118} x={box.x} y={24} z={20} />
              <Print
                o={T}
                on="left"
                size={12}
                tone={box.on ? "ink" : "muted"}
                x={box.x + 10}
                y={152}
                z={44}
              >
                {box.name}
              </Print>
              <Print o={T} on="left" x={box.x + 10} y={152} z={30}>
                {box.sub}
              </Print>
              <Flat className="screen" d={60} o={T} w={74} x={gx} y={gy} z={z} />
              <path
                className="stroke"
                d={segment(at(T, gx, gy + 12, z), at(T, gx + 74, gy + 12, z))}
              />
              <path
                className="stroke"
                d={`M${at(T, gx + 12, gy + 24, z).join(" ")} L${at(T, gx + 22, gy + 32, z).join(" ")} L${at(T, gx + 12, gy + 40, z).join(" ")}`}
              />
              <g className={box.on ? "cursor" : undefined}>
                <Bar
                  from={at(T, gx + 28, gy + 44, z)}
                  to={at(T, gx + 44, gy + 44, z)}
                  tone={box.on ? "amber" : "dim"}
                  width={2}
                />
              </g>
              {box.on ? <Lamp p={at(T, box.x + 104, 36, 90)} /> : null}
            </Lift>
          </Part>
        );
      })}
      <Part i={5}>
        <Wire a={a} b={b} />
        <Caption p={middle(a, b, -10)}>ssh</Caption>
      </Part>
      <Part className="callout" i={6}>
        <text className="call" textAnchor="end" x={200} y={296}>
          Your laptop
        </text>
        <text className="print muted" fontSize={11} textAnchor="end" x={200} y={316}>
          the app · close it anytime
        </text>
        <path className="stroke" d="M212 302 L244 302" />
        <circle className="pin" cx={212} cy={302} r={2.5} />
        <circle className="pin" cx={244} cy={302} r={2.5} />
        <path className="stroke" d="M1196 378 L1240 378" />
        <circle className="pin" cx={1196} cy={378} r={2.5} />
        <circle className="pin" cx={1240} cy={378} r={2.5} />
        <text className="call" x={1252} y={372}>
          Your boxes
        </text>
        <text className="print muted" fontSize={11} x={1252} y={392}>
          agents · dev servers
        </text>
      </Part>
    </Drawing>
  );
}

const CELL = "0 0 719 339";

/** 01 Start: a ⌘N key sends a worktree onto a box. */
export function StartDrawing() {
  const K: Origin = [222, 190];
  const B: Origin = [477, 132];
  const a = at(K, 92, 46, 9);
  const b = at(B, 0, 96, 30);
  return (
    <Drawing
      name="start"
      title="A ⌘N key, and a worktree called checkout-fix landing on the box devl with its lamp lit."
      viewBox={CELL}
    >
      <Part i={0}>
        <Box className="tray" d={92} h={18} o={K} w={92} x={0} y={0} z={0} />
        <g className="key">
          <Box d={76} h={10} o={K} w={76} x={8} y={8} z={18} />
          <Print o={K} on="across" size={26} tone="ink" x={52} y={68} z={28}>
            ⌘N
          </Print>
        </g>
      </Part>
      <Part i={1}>
        <Box d={120} h={64} o={B} w={120} x={0} y={0} z={0} />
        <Print o={B} on="left" size={12} tone="ink" x={10} y={120} z={18}>
          devl
        </Print>
      </Part>
      <Part i={2}>
        <Flat className="ghost" d={76} o={B} w={76} x={22} y={22} z={64} />
        {[
          [22, 98],
          [98, 98],
          [98, 22],
        ].map(([x, y]) => (
          <path className="drop" d={segment(at(B, x, y, 64), at(B, x, y, 86))} key={`${x}-${y}`} />
        ))}
      </Part>
      <Part i={3}>
        <Wire a={a} b={b} />
        <Caption p={middle(a, b, -12)}>new worktree</Caption>
      </Part>
      <g className="slab">
        <Lift>
          <Box d={76} h={9} o={B} w={76} x={22} y={22} z={86} />
          <Print o={B} on="top" size={9} tone="ink" x={30} y={52} z={95}>
            checkout-fix
          </Print>
          <Lamp p={at(B, 86, 34, 95)} />
        </Lift>
      </g>
    </Drawing>
  );
}

/** 02 Watch it work: the agent's steps, a diff and a question, stepping up. */
export function WatchDrawing() {
  const O: Origin = [215, 112];
  const W = 170;
  const D = 116;
  const H = 8;
  const layers: { x: number; z: number; name: string; body: (z: number) => ReactNode }[] = [
    {
      x: 0,
      z: 0,
      name: "steps",
      body: (z) =>
        [0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <Bar from={at(O, 18 + i * 17, 16, z)} to={at(O, 18 + i * 17, 26, z)} tone="dim" />
            <Bar
              from={at(O, 18 + i * 17, 34, z)}
              to={at(O, 18 + i * 17, 34 + 62 - i * 9, z)}
              tone="line"
            />
          </g>
        )),
    },
    {
      x: 104,
      z: 50,
      name: "diff",
      body: (z) => (
        <>
          <Bar from={at(O, 124, 16, z)} to={at(O, 124, 86, z)} tone="red" width={5} />
          <Bar from={at(O, 142, 16, z)} to={at(O, 142, 102, z)} tone="green" width={5} />
          <Bar from={at(O, 160, 16, z)} to={at(O, 160, 94, z)} tone="green" width={5} />
          <Bar from={at(O, 178, 16, z)} to={at(O, 178, 60, z)} tone="line" />
        </>
      ),
    },
    {
      x: 208,
      z: 100,
      name: "question",
      body: (z) => (
        <>
          <Lamp p={at(O, 236, 30, z)} r={4} />
          <Bar from={at(O, 254, 30, z)} to={at(O, 354, 30, z)} tone="ink" width={4} />
          <Bar from={at(O, 254, 52, z)} to={at(O, 318, 52, z)} tone="dim" />
          <Box d={26} h={6} o={O} w={40} x={278} y={76} z={z} />
          <g className="press">
            <Box className="solid" d={26} h={6} o={O} w={40} x={326} y={76} z={z} />
          </g>
        </>
      ),
    },
  ];
  return (
    <Drawing
      name="watch"
      title="Three layers stepping up: the agent's steps, a diff in red and green, and a question waiting with two buttons."
      viewBox={CELL}
    >
      {layers.map((layer, i) => (
        <Part i={i} key={layer.name}>
          <g className={`layer layer-${i}`}>
            <Box d={D} h={H} o={O} w={W} x={layer.x} y={0} z={layer.z} />
            <Print o={O} on="left" size={9} x={layer.x + 10} y={D} z={layer.z + 1.5}>
              {layer.name}
            </Print>
            {layer.body(layer.z + H)}
          </g>
        </Part>
      ))}
    </Drawing>
  );
}

/** 03 See the page: phone, tablet and desktop screens, one block flagged by the visual diff. */
export function PageDrawing() {
  const O: Origin = [205, 100];
  const screens = [
    { x: 24, w: 46, h: 92, size: "375" },
    { x: 96, w: 92, h: 118, size: "768" },
    { x: 214, w: 148, h: 112, size: "1280" },
  ];
  const tag = at(O, 302, 37, 64);
  return (
    <Drawing
      name="page"
      title="A phone, a tablet and a desktop screen on a tray; the desktop's changed block is outlined in red: 3% diff."
      viewBox={CELL}
    >
      <Part i={0}>
        <Box className="tray" d={70} h={12} o={O} w={380} x={0} y={0} z={0} />
      </Part>
      {screens.map((s, i) => {
        const y = 30;
        const z = 12;
        const fy = y + 7;
        return (
          <Part i={1 + i} key={s.size}>
            <Lift>
              <Box d={7} h={s.h} o={O} w={s.w} x={s.x} y={y} z={z} />
              <Upright
                className="screen"
                h={s.h - 10}
                o={O}
                w={s.w - 10}
                x={s.x + 5}
                y={fy}
                z={z + 5}
              />
              <Bar
                from={at(O, s.x + 10, fy, z + s.h - 14)}
                to={at(O, s.x + 10 + Math.min(40, s.w - 20), fy, z + s.h - 14)}
                tone="ink"
              />
              <Bar
                from={at(O, s.x + 10, fy, z + s.h - 26)}
                to={at(O, s.x + 10 + s.w - 24, fy, z + s.h - 26)}
                tone="line"
              />
              <Bar
                from={at(O, s.x + 10, fy, z + s.h - 36)}
                to={at(O, s.x + 10 + (s.w - 24) * 0.7, fy, z + s.h - 36)}
                tone="line"
              />
              <Upright
                className="block"
                h={Math.max(20, s.h * 0.34)}
                o={O}
                w={s.w - 20}
                x={s.x + 10}
                y={fy}
                z={z + 14}
              />
              {i === 2 ? (
                <Upright className="changed" h={38} o={O} w={70} x={s.x + 18} y={fy} z={z + 14} />
              ) : null}
            </Lift>
            <Print o={O} on="left" size={9} x={s.x + 2} y={70} z={3.5}>
              {s.size}
            </Print>
          </Part>
        );
      })}
      <Part className="tag" i={4}>
        <rect
          className="tag-box"
          height={18}
          rx={4}
          width={64}
          x={round(tag[0] + 6)}
          y={round(tag[1] - 18)}
        />
        <text
          className="print red"
          fontSize={10}
          textAnchor="middle"
          x={round(tag[0] + 38)}
          y={round(tag[1] - 5.5)}
        >
          3% diff
        </text>
      </Part>
    </Drawing>
  );
}

/** 04 Loop until green: three attempts at one task, one passes. */
export function LoopDrawing() {
  const O: Origin = [215, 62];
  const attempts = [
    { x: 16, name: "attempt 1", status: "✗ 3 failing", ok: false },
    { x: 146, name: "attempt 2", status: "✓ 48 passed", ok: true },
    { x: 276, name: "attempt 3", status: "✗ timed out", ok: false },
  ];
  return (
    <Drawing
      name="loop"
      title="Three attempts at one task on a tray: attempt 2 passes with its lamp lit, attempts 1 and 3 fail."
      viewBox={CELL}
    >
      <Part i={0}>
        <Box className="tray" d={124} h={12} o={O} w={400} x={0} y={0} z={0} />
        <Print o={O} on="left" size={9} x={12} y={124} z={3}>
          attempts · compare
        </Print>
      </Part>
      {attempts.map((a, i) => {
        const z = 52;
        return (
          <Part className={a.ok ? "winner" : "dim"} i={1 + i} key={a.name}>
            <Lift>
              <Box d={92} h={40} o={O} w={110} x={a.x} y={16} z={12} />
              {[56, 40, 62, 28].map((len, j) => (
                <Bar
                  from={at(O, a.x + 18 + j * 19, 28, z)}
                  key={len}
                  to={at(O, a.x + 18 + j * 19, 28 + len, z)}
                  tone={a.ok ? "line" : "soft"}
                />
              ))}
              <Bar
                from={at(O, a.x + 94, 28, z)}
                to={at(O, a.x + 94, 90, z)}
                tone={a.ok ? "green" : "red"}
                width={5}
              />
              <Print
                o={O}
                on="left"
                size={11}
                tone={a.ok ? "ink" : "muted"}
                x={a.x + 8}
                y={108}
                z={24}
              >
                {a.name}
              </Print>
              <Print
                o={O}
                on="left"
                size={9}
                tone={a.ok ? "green" : "red"}
                x={a.x + 8}
                y={108}
                z={13}
              >
                {a.status}
              </Print>
              {a.ok ? <Lamp p={at(O, a.x + 96, 24, z)} r={4} /> : null}
            </Lift>
          </Part>
        );
      })}
      <Part i={4}>
        <Caption anchor="start" p={[40, 318]}>
          loop until pnpm test passes, then keep the best
        </Caption>
      </Part>
    </Drawing>
  );
}

/** 05 Review: an inbox of finished work, and a teammate's pull request beside it. */
export function ReviewDrawing() {
  const O: Origin = [330, 100];
  const B: Origin = [160, 196];
  const cards = [
    { dy: 34, z: 18 },
    { dy: 22, z: 25 },
    { dy: 10, z: 32 },
  ];
  return (
    <Drawing
      name="review"
      title="An inbox tray of finished work, the top card checkout-fix with its diff, +12 −3; beside it a pull request card, acme/shop#42, with a Review in Shipyard link."
      viewBox={CELL}
    >
      <Part i={0}>
        <Box className="tray" d={170} h={18} o={O} w={220} x={0} y={0} z={0} />
        <Print o={O} on="left" x={12} y={170} z={5}>
          review
        </Print>
      </Part>
      {cards.map((card, i) => {
        const top = i === cards.length - 1;
        const z = card.z + 6;
        const y0 = card.dy;
        const body = (
          <>
            <Box d={118} h={6} o={O} w={176} x={22} y={card.dy} z={card.z} />
            {top ? (
              <>
                <Print o={O} on="top" size={11} tone="ink" x={36} y={y0 + 22} z={z}>
                  checkout-fix
                </Print>
                <Print o={O} on="top" tone="green" x={132} y={y0 + 22} z={z}>
                  +12 −3
                </Print>
                <Bar
                  from={at(O, 36, y0 + 40, z)}
                  to={at(O, 156, y0 + 40, z)}
                  tone="red"
                  width={5}
                />
                <Bar
                  from={at(O, 36, y0 + 56, z)}
                  to={at(O, 176, y0 + 56, z)}
                  tone="green"
                  width={5}
                />
                <Bar
                  from={at(O, 36, y0 + 72, z)}
                  to={at(O, 136, y0 + 72, z)}
                  tone="green"
                  width={5}
                />
                <Bar from={at(O, 36, y0 + 88, z)} to={at(O, 106, y0 + 88, z)} tone="line" />
                <Box className="solid" d={16} h={5} o={O} w={46} x={136} y={y0 + 96} z={z} />
              </>
            ) : null}
          </>
        );
        return (
          <Part i={1 + i} key={card.dy}>
            {top ? <Lift>{body}</Lift> : body}
          </Part>
        );
      })}
      <Part i={4}>
        <Lift className="pr">
          <Box d={54} h={6} o={B} w={74} x={0} y={0} z={0} />
          <Print o={B} on="top" size={9} tone="ink" x={10} y={22} z={6}>
            acme/shop#42
          </Print>
          <Print o={B} on="top" size={8} x={10} y={38} z={6}>
            Review in Shipyard
          </Print>
        </Lift>
      </Part>
    </Drawing>
  );
}

/** 06 From your phone: a phone on the table answering an agent on a box. */
export function PhoneDrawing() {
  const Ph: Origin = [220, 78];
  const B: Origin = [520, 112];
  const z = 9;
  const a = at(Ph, 104, 80, 5);
  const b = at(B, 0, 60, 18);
  return (
    <Drawing
      name="phone"
      title="A phone showing an agent's question with Deny and Allow, linked over the tailnet to the box devl, where qa-deck asks."
      viewBox={CELL}
    >
      <Part i={0}>
        <Lift>
          <Box className="solid" d={196} h={9} o={Ph} w={104} x={0} y={0} z={0} />
          <Flat className="screen" d={168} o={Ph} w={90} x={7} y={14} z={z} />
          <Flat className="card" d={74} o={Ph} w={76} x={14} y={26} z={z} />
          <Lamp p={at(Ph, 24, 38, z)} />
          <Bar from={at(Ph, 36, 38, z)} to={at(Ph, 82, 38, z)} tone="ink" />
          <Bar from={at(Ph, 24, 54, z)} to={at(Ph, 82, 54, z)} tone="line" />
          <Box d={18} h={4} o={Ph} w={30} x={20} y={70} z={z} />
          <g className="press">
            <Box className="solid" d={18} h={4} o={Ph} w={30} x={56} y={70} z={z} />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <Flat className="card" d={15} o={Ph} w={76} x={14} y={112 + i * 22} z={z} />
              <Bar
                from={at(Ph, 22, 119.5 + i * 22, z)}
                to={at(Ph, 22 + 36 - i * 7, 119.5 + i * 22, z)}
                tone="line"
              />
            </g>
          ))}
        </Lift>
      </Part>
      <Part i={1}>
        <Lift>
          <Box d={96} h={54} o={B} w={96} x={0} y={0} z={0} />
          <Print o={B} on="left" size={12} tone="ink" x={10} y={96} z={22}>
            devl
          </Print>
          <Print o={B} on="left" size={9} x={10} y={96} z={10}>
            qa-deck asks
          </Print>
          <Lamp p={at(B, 48, 48, 54)} r={4} />
        </Lift>
      </Part>
      <Part i={2}>
        <Wire a={a} b={b} />
        <Caption p={middle(a, b, -10)}>tailnet</Caption>
      </Part>
    </Drawing>
  );
}

/** Close the laptop: the laptop shut, two boxes still lit. */
export function NightDrawing() {
  const L: Origin = [150, 196];
  const T: Origin = [500, 120];
  const boxes = [
    { x: 20, name: "devl", sub: "3 working" },
    { x: 160, name: "gpu", sub: "1 working" },
  ];
  return (
    <Drawing
      name="night"
      title="The laptop closed, and the boxes devl and gpu still lit, with three agents and one agent working."
      viewBox="10 -36 800 444"
    >
      <Part i={0}>
        <Box d={90} h={10} o={L} w={130} x={0} y={0} z={0} />
        <Box d={86} h={5} o={L} w={126} x={2} y={2} z={10} />
        <g className="zz">
          <Print o={L} on="top" size={12} x={40} y={34} z={15}>
            z z z
          </Print>
        </g>
      </Part>
      <Part i={1}>
        <Box className="tray" d={140} h={16} o={T} w={300} x={0} y={0} z={0} />
        <Print o={T} on="left" x={12} y={140} z={5}>
          still running
        </Print>
      </Part>
      {boxes.map((box, i) => (
        <Part i={2 + i} key={box.name}>
          <Lift>
            <Box d={100} h={60} o={T} w={110} x={box.x} y={20} z={16} />
            <Print o={T} on="left" size={12} tone="ink" x={box.x + 10} y={120} z={36}>
              {box.name}
            </Print>
            <Print o={T} on="left" x={box.x + 10} y={120} z={24}>
              {box.sub}
            </Print>
            <Lamp p={at(T, box.x + 55, 70, 76)} r={4} />
          </Lift>
        </Part>
      ))}
      <Part i={4}>
        <Wire a={at(L, 130, 45, 5)} b={at(T, 0, 140, 8)} quiet />
      </Part>
    </Drawing>
  );
}
