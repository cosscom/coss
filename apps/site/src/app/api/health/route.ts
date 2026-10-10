/**
 * The load balancer's health check for this app's target group. ALB health checks reach each
 * target directly, so this path is never routed to the site on coss.com (`/api/*` there is the
 * dashboard's). Touches nothing but the process itself.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
