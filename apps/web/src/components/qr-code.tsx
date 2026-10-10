import { encode } from "uqr";

/** A QR code drawn as SVG modules (no HTML injection). Always dark-on-white so it scans. */
export function QrCode({
  value,
  label,
  size = 192,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const { data, size: modules } = encode(value, { ecc: "M", border: 2 });
  let path = "";
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    });
  });
  return (
    <svg
      aria-label={label}
      className="rounded-lg border bg-white"
      height={size}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
    >
      <path d={path} fill="#000" />
    </svg>
  );
}
