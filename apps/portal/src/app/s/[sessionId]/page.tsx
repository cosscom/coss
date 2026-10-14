import type { Metadata } from "next";
import { Portal } from "./portal";

export const metadata: Metadata = { title: "Webhooks" };
export const dynamic = "force-dynamic";

/**
 * The portal of one application. The server knows only the session id; the client reads the token
 * from the URL fragment and calls the portal API with it.
 */
export default async function PortalPage({ params }: PageProps<"/s/[sessionId]">) {
  const { sessionId } = await params;
  return <Portal sessionId={sessionId} />;
}
