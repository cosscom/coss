import type { Metadata } from "next";
import { Signing } from "./signing";

export const metadata: Metadata = { title: "Sign documents" };
export const dynamic = "force-dynamic";

/**
 * One signer's signing page. The server knows only the session id; the client reads the token from
 * the URL fragment and calls the signing API with it.
 */
export default async function SigningPage({ params }: PageProps<"/s/[sessionId]">) {
  const { sessionId } = await params;
  return <Signing sessionId={sessionId} />;
}
