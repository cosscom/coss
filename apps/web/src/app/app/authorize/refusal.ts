import type { Session } from "@/lib/auth";

export function appSignInRefusal(session: Session): string | null {
  if (session.session.impersonatedBy) return "Impersonation sessions can't sign in to the app.";
  if (!session.user.emailVerified)
    return `Verify ${session.user.email} before signing in to the app.`;
  return null;
}
