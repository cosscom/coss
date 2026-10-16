import { getAttachment } from "@/lib/store";

/** A file attached to a Prompt Request, served from the store. Images and PDFs inline, the rest downloaded. */
export async function GET(_request: Request, { params }: RouteContext<"/attachments/[id]">) {
  const { id } = await params;
  const file = getAttachment(id);
  if (!file) return new Response("Not found", { status: 404 });
  const inline = /^(image\/|application\/pdf|video\/)/.test(file.type);
  const name = file.name.replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(file.bytes).buffer as ArrayBuffer, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
