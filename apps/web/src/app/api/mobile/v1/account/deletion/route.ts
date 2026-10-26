import { auth } from "@coss/auth";
import type {
  AccountDeletionResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
} from "@coss/companion";
import { TenancyError } from "@coss/tenancy";
import {
  AccountDeletionBlocked,
  accountDeletionPlan,
  blockerMessage,
  deleteAccount,
} from "@/lib/account-deletion";
import { MobileApiError, mobileRoute, requireMobileSession } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(async (request): Promise<AccountDeletionResponse> => {
  const session = await requireMobileSession(request);
  const plan = await accountDeletionPlan(session.user.id);
  const organization = (org: { name: string; slug: string }) => ({
    name: org.name,
    slug: org.slug,
  });
  return {
    delete_organizations: plan.deleteOrganizations.map(organization),
    leave_organizations: plan.leaveOrganizations.map(organization),
    blockers: plan.blockers.map(blockerMessage),
  };
});

/** The dashboard's `deleteAccountAction`: a recent sign-in and the typed email address. */
export const POST = mobileRoute(async (request): Promise<DeleteAccountResponse> => {
  const session = await requireMobileSession(request);
  const body = (await request.json().catch(() => null)) as Partial<DeleteAccountRequest> | null;
  const { user } = session;
  if (
    typeof body?.confirm !== "string" ||
    body.confirm.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new MobileApiError(400, "invalid_request", `Type ${user.email} to confirm.`);
  }
  const { freshAge } = (await auth.$context).sessionConfig;
  if (Date.now() - new Date(session.session.createdAt).getTime() > freshAge * 1000) {
    throw new MobileApiError(
      403,
      "reauthentication_required",
      "For your security, sign in again before deleting your account.",
    );
  }
  try {
    await deleteAccount({ id: user.id, email: user.email });
  } catch (error) {
    if (error instanceof AccountDeletionBlocked || error instanceof TenancyError) {
      throw new MobileApiError(409, "forbidden", error.message);
    }
    throw error;
  }
  return { deleted: true };
});
