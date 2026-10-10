/**
 * Load balancer health check: the process is up and serving. Deliberately touches no database or
 * other dependency, so a database outage doesn't make the load balancer drain every task.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
