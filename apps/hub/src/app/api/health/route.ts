/** The load balancer's health check: the process answers, nothing else is touched. */
export function GET() {
  return Response.json({ ok: true });
}
