import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "./site";

/*
 * coss.com's Open Graph cards: one ruled grayscale sheet, the wordmark, a title and the line under
 * it, drawn like the landing page (DESIGN.md: no hue, Cal Sans and Paper Mono). Satori reads TTF,
 * not the woff2 the pages use, so the OFL fonts are copied to assets/fonts. Every card is rendered
 * at build time (the routes have no dynamic params).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/CalSans-SemiBold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/PaperMono-Regular.ttf")),
]);

const INK = "#0a0a0a";
const PAPER = "#fafafa";
const RULE = "#d4d4d4";
const MUTED = "#525252";

export interface OgCard {
  /** The small label above the title: a section ("Products") or an SDK namespace. */
  label: string;
  title: string;
  description?: string;
}

export async function ogImage({ label, title, description }: OgCard): Promise<ImageResponse> {
  const [sans, mono] = await fonts;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: PAPER,
        color: INK,
        padding: 40,
        fontFamily: "Cal Sans",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${RULE}`,
          backgroundImage: `radial-gradient(${RULE} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 40px",
            borderBottom: `1px solid ${RULE}`,
            background: PAPER,
          }}
        >
          <span style={{ fontSize: 34 }}>{SITE_NAME}</span>
          <span style={{ fontFamily: "Paper Mono", fontSize: 22, color: MUTED }}>{label}</span>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "40px",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: title.length > 48 ? 64 : 80,
              lineHeight: 0.98,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ fontSize: 30, lineHeight: 1.25, color: MUTED, maxWidth: 980 }}>
              {description.length > 140 ? `${description.slice(0, 137)}…` : description}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Cal Sans", data: sans, weight: 600, style: "normal" },
        { name: "Paper Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
