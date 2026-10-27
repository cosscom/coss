import { signDeps } from "@/lib/runtime";
import { handleSignRequest } from "@/lib/sign-api";

export const dynamic = "force-dynamic";

type Context = RouteContext<"/api/sessions/[sessionId]/[[...path]]">;

async function handle(request: Request, context: Context): Promise<Response> {
  const { sessionId, path } = await context.params;
  return handleSignRequest(request, sessionId, path ?? [], signDeps(request.headers));
}

export { handle as GET, handle as POST };
