import type { Metadata } from "next";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Edit template" };
export const dynamic = "force-dynamic";

/** The template builder of one builder session (the token is in the URL fragment). */
export default async function BuilderPage({ params }: PageProps<"/b/[sessionId]">) {
  const { sessionId } = await params;
  return <Builder sessionId={sessionId} />;
}
