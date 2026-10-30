import { listSmsNumbers, listSmsRegistrations } from "@coss/sms";
import { Button } from "@coss/ui/components/button";
import { ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { requireOrgMember } from "@/lib/session";
import { smsProvisioningEnabled } from "@/lib/sms";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = { title: "Register a sender" };

export default async function RegisterSmsSenderPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/sms/register">) {
  const { orgSlug } = await params;
  const query = await searchParams;
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
  const canRegister10dlc = !active.some((row) => row.kind === "us_10dlc");
  // Opened for one number (`?number=`) or one kind (`?kind=`), e.g. from the SMS page's prompts.
  const numberParam = typeof query.number === "string" ? query.number : null;
  const initialNumberId = tollFreeNumbers.some((number) => number.id === numberParam)
    ? numberParam
    : null;
  const initialKind =
    initialNumberId || (query.kind === "toll_free" && tollFreeNumbers.length > 0)
      ? "toll_free"
      : canRegister10dlc
        ? "us_10dlc"
        : "toll_free";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Carriers only deliver application-to-person SMS from registered senders. coss.com submits these details to Twilio for carrier review, which usually takes a few days; you'll see the outcome on the SMS page."
        title="Register a sender"
      />
      {canRegister10dlc || tollFreeNumbers.length > 0 ? (
        <RegistrationForm
          canRegister10dlc={canRegister10dlc}
          initialKind={initialKind}
          initialNumberId={initialNumberId}
          orgSlug={organization.slug}
          tollFreeNumbers={tollFreeNumbers}
        />
      ) : (
        <Panel>
          <PanelBody flush>
            <EmptyState
              action={
                <Button render={<Link href={`/${organization.slug}/sms`} />} size="sm">
                  Back to SMS
                </Button>
              }
              compact
              description="Your US A2P 10DLC registration covers your local numbers, and every toll-free number is verified or in review. Buy a toll-free number to verify another."
              icon={ShieldCheckIcon}
              title="Nothing left to register"
            />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
