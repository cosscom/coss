import { listSmsNumbers, listSmsRegistrations } from "@coss/sms";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireOrgMember } from "@/lib/session";
import { smsProvisioningEnabled } from "@/lib/sms";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = { title: "Register a sender" };

export default async function RegisterSmsSenderPage({
  params,
}: PageProps<"/[orgSlug]/sms/register">) {
  const { orgSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ smsSender: ["create"] }) || !smsProvisioningEnabled()) notFound();
  const [numbers, registrations] = await Promise.all([
    listSmsNumbers(organization.id),
    listSmsRegistrations(organization.id),
  ]);
  const active = registrations.filter((row) =>
    ["submitted", "in_review", "approved"].includes(row.status),
  );
  const tollFreeNumbers = numbers
    .filter(
      (row) =>
        row.number.kind === "toll_free" &&
        // Bought (its purchase settled) and not being released.
        row.number.providerSid !== null &&
        row.number.status !== "releasing" &&
        !active.some((registration) => registration.numberId === row.number.id),
    )
    .map((row) => ({ id: row.number.id, phoneNumber: row.number.phoneNumber }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Carriers only deliver application-to-person SMS from registered senders. coss.com submits these details to Twilio for carrier review, which usually takes a few days; you'll see the outcome on the SMS page."
        title="Register a sender"
      />
      <RegistrationForm
        canRegister10dlc={!active.some((row) => row.kind === "us_10dlc")}
        orgSlug={organization.slug}
        tollFreeNumbers={tollFreeNumbers}
      />
    </div>
  );
}
