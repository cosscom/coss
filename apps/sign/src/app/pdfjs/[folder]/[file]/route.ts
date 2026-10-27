import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { version } from "pdfjs-dist/package.json";

/**
 * pdf.js's own data files (CMaps for CJK text, standard fonts, ICC profiles and the wasm image
 * decoders for JPEG 2000 and JBIG2), served from this origin: the viewer loads them only when a
 * document needs them, and the CSP allows nothing from elsewhere.
 */
const FOLDERS = new Set(["cmaps", "standard_fonts", "iccs", "wasm"]);
const TYPES: Record<string, string> = {
  ".wasm": "application/wasm",
  ".js": "text/javascript",
};

/**
 * The package's directory in Bun's store at the repository root (`node_modules/.bun/pdfjs-dist@
 * <version>…`), where `outputFileTracingIncludes` copies these folders into the standalone server
 * too. The server runs from the app's directory, in development and standalone alike.
 */
let root: Promise<string | null> | undefined;
function packageRoot(): Promise<string | null> {
  root ??= (async () => {
    const store = path.join(/* turbopackIgnore: true */ process.cwd(), "../../node_modules/.bun");
    const entry = (await readdir(store).catch(() => [])).find(
      (name) => name === `pdfjs-dist@${version}` || name.startsWith(`pdfjs-dist@${version}+`),
    );
    return entry ? path.join(store, entry, "node_modules", "pdfjs-dist") : null;
  })();
  return root;
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/pdfjs/[folder]/[file]">,
): Promise<Response> {
  const { folder, file } = await params;
  if (!FOLDERS.has(folder) || !/^[\w.-]+$/.test(file) || file.startsWith(".")) {
    return new Response("Not found", { status: 404 });
  }
  const directory = await packageRoot();
  if (!directory) return new Response("Not found", { status: 404 });
  try {
    const content = await readFile(path.join(directory, folder, file));
    return new Response(content, {
      headers: {
        "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
