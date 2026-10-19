import { RATE_CARDS, rateCardAt } from "@coss/billing/catalog";
import { formatUnitPrice } from "@coss/billing/money";
import {
  allowedCountries,
  canSendFrom,
  getSmsAccount,
  HIGH_RISK_SMS_COUNTRIES,
  listSmsNumbers,
  listSmsRegistrations,
} from "@coss/sms";
import { listProjectsWithEnvironments } from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { MessageSquareIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelTitle } from "@/components/panel";
import { RegistrationStatusDot, SmsStatusDot } from "@/components/sms-badges";
import { StatusDot } from "@/components/status-dot";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { smsProvisioningEnabled } from "@/lib/sms";
import {
  BuyNumberDialog,
  CountriesForm,
  type EnvironmentOption,
  ReceivingEnvironmentForm,
  ReleaseNumberButton,
} from "./sms-forms";

export const metadata: Metadata = { title: "SMS" };

const REGIONS = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return REGIONS.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries with a list price now (or from the next card, if it is already published). */
function pricedCountries(): { code: string; price: string }[] {
  const now = rateCardAt(new Date());
  const latest = RATE_CARDS.at(-1) ?? now;
  const byDimension = {
    ...now.rates["sms.segments"]?.byDimension,
    ...latest.rates["sms.segments"]?.byDimension,
  };
  return Object.entries(byDimension).flatMap(([dimension, rate]) => {
    const [tier] = rate.tiers;
    return tier
      ? [
          {
            code: dimension.slice(dimension.indexOf("=") + 1),
            price: formatUnitPrice(tier.unitNanos),
          },
        ]
      : [];
  });
}

const KIND_LABEL = { us_10dlc: "US A2P 10DLC", toll_free: "Toll-free verification" } as const;

export default async function OrganizationSmsPage({ params }: PageProps<"/[orgSlug]/sms">) {
  const { orgSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ smsSender: ["read"] })) notFound();
  const [numbers, registrations, account, projects] = await Promise.all([
    listSmsNumbers(organization.id),
    listSmsRegistrations(organization.id),
    getSmsAccount(organization.id),
    listProjectsWithEnvironments({ organizationId: organization.id }),
  ]);
  const sendable = await Promise.all(numbers.map((row) => canSendFrom(organization.id, row)));
  const environments: EnvironmentOption[] = projects.flatMap(({ project, environments: list }) =>
    list
      .filter((environment) => environment.mode === "live")
      .map((environment) => ({
        id: environment.id,
        label: `${project.name} / ${environment.name}`,
      })),
  );
  const environmentLabel = new Map(
    environments.map((environment) => [environment.id, environment.label]),
  );
  const enabled = smsProvisioningEnabled();
  const canCreate = can({ smsSender: ["create"] }) && enabled;
  const canUpdate = can({ smsSender: ["update"] });
  const canDelete = can({ smsSender: ["delete"] });
  const allowed = [...allowedCountries(account)];
  const unlocked = account?.unlockedCountries ?? [];
  const countries = pricedCountries()
    .map((country) => ({
      ...country,
      name: countryName(country.code),
      locked: HIGH_RISK_SMS_COUNTRIES.includes(country.code) && !unlocked.includes(country.code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tenDlc = registrations.find(
    (row) => row.kind === "us_10dlc" && row.status !== "rejected" && row.status !== "failed",
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          canCreate ? (
            <>
              <Button
                render={<Link href={`/${organization.slug}/sms/register`} />}
                size="sm"
                variant="outline"
              >
                Register a sender
              </Button>
              <BuyNumberDialog environments={environments} orgSlug={organization.slug} />
            </>
          ) : null
        }
        description="Your organization's phone numbers, their carrier registrations and the countries live messages may go to. Sandbox environments need none of this: their messages are simulated."
        title="SMS"
      />

      {!enabled ? (
        <Alert>
          <AlertTitle>SMS senders aren't available yet</AlertTitle>
          <AlertDescription>
            Sandbox environments already send simulated messages. Contact support to get started
            with live SMS.
          </AlertDescription>
        </Alert>
      ) : !tenDlc && numbers.some((row) => row.number.kind === "local") ? (
        <Alert variant="warning">
          <AlertTitle>Register your business to send from local numbers</AlertTitle>
          <AlertDescription>
            US carriers block A2P traffic from unregistered 10DLC numbers. Registration takes a few
            days; your numbers start sending once it is approved.
          </AlertDescription>
        </Alert>
      ) : null}

      <Panel>
        <PanelHeader>
          <PanelTitle>Numbers</PanelTitle>
          <PanelDescription>
            Live sends go `from` one of these, once its registration is approved.
          </PanelDescription>
        </PanelHeader>
        {numbers.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="Buy a local number (registered for US A2P 10DLC) or a toll-free one (verified on its own)."
              icon={MessageSquareIcon}
              title="No numbers yet"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sending</TableHead>
                <TableHead>Replies go to</TableHead>
                {canDelete ? <TableHead className="w-0" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {numbers.map((row, index) => (
                <TableRow key={row.number.id}>
                  <TableCell className="font-mono text-[0.8125rem]">
                    {row.number.phoneNumber}
                  </TableCell>
                  <TableCell>{row.number.kind === "toll_free" ? "Toll-free" : "Local"}</TableCell>
                  <TableCell>
                    {sendable[index] ? (
                      <SmsStatusDot status="delivered" />
                    ) : row.number.status === "pending" ? (
                      <StatusDot tone="warning">Setting up</StatusDot>
                    ) : (
                      <RegistrationStatusDot status={row.registration?.status ?? null} />
                    )}
                  </TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <ReceivingEnvironmentForm
                        environments={environments}
                        numberId={row.number.id}
                        orgSlug={organization.slug}
                        phoneNumber={row.number.phoneNumber}
                        value={row.number.receivingEnvironmentId}
                      />
                    ) : (
                      (environmentLabel.get(row.number.receivingEnvironmentId ?? "") ?? "Dropped")
                    )}
                  </TableCell>
                  {canDelete ? (
                    <TableCell>
                      <ReleaseNumberButton
                        numberId={row.number.id}
                        orgSlug={organization.slug}
                        phoneNumber={row.number.phoneNumber}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Registrations</PanelTitle>
          <PanelDescription>
            Carriers review the business behind every sender. coss.com submits your details to
            Twilio and follows the review; brand and campaign fees are passed through at cost.
          </PanelDescription>
        </PanelHeader>
        {registrations.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="Register your business for US A2P 10DLC, or verify a toll-free number."
              icon={ShieldCheckIcon}
              title="Nothing registered yet"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{KIND_LABEL[row.kind]}</TableCell>
                  <TableCell>{row.profile.legalName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <RegistrationStatusDot status={row.status} />
                      {row.rejectionReason ? (
                        <span className="max-w-96 text-muted-foreground text-xs">
                          {row.rejectionReason}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.submittedAt ? formatDateTime(row.submittedAt.toISOString()) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Countries</PanelTitle>
          <PanelDescription>
            Where live messages may go, with the price per segment. Allowing only the countries your
            customers are in protects you from SMS pumping fraud.
          </PanelDescription>
        </PanelHeader>
        <PanelBody>
          <CountriesForm
            allowed={allowed}
            countries={countries}
            disabled={!canUpdate}
            orgSlug={organization.slug}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
