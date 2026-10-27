import { handleBuilderRequest } from "@/lib/builder-api";
import { signDeps } from "@/lib/runtime";

export const dynamic = "force-dynamic";

type Context = RouteContext<"/api/builder/[sessionId]/[[...path]]">;

async function handle(request: Request, context: Context): Promise<Response> {
  const { sessionId, path } = await context.params;
  return handleBuilderRequest(request, sessionId, path ?? [], signDeps(request.headers));
}

export { handle as GET, handle as POST, handle as PUT };
