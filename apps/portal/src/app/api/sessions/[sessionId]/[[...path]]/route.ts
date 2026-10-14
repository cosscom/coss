import { handlePortalRequest } from "@/lib/portal-api";
import { portalDeps } from "@/lib/runtime";

export const dynamic = "force-dynamic";

type Context = RouteContext<"/api/sessions/[sessionId]/[[...path]]">;

async function handle(request: Request, context: Context): Promise<Response> {
  const { sessionId, path } = await context.params;
  return handlePortalRequest(request, sessionId, path ?? [], portalDeps(request.headers));
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST };
