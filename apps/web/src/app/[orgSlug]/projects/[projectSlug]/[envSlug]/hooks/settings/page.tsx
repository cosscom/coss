import { getHookPortalSettings } from "@coss/hooks";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PortalSettingsForm } from "../hook-actions";
import { hookPageContext } from "../page-context";

export const metadata: Metadata = { title: "Hooks portal settings" };

export default async function HookPortalSettingsPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks/settings">) {
  const { can, organization, environment, hooksPath, target } = await hookPageContext(await params);
  if (!can({ hook: ["update"] })) notFound();
  const settings = await getHookPortalSettings({
    organizationId: organization.id,
    environmentId: environment.id,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={hooksPath}>
          ← Hooks
        </Link>
        <PageHeader
          description="How the portal looks for your applications' users, and which of your sites may embed it."
          title="Portal settings"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Portal</CardTitle>
          <CardDescription>
            Your backend creates a portal session for an application
            (`coss.hooks.portal.createSession`) and opens or embeds its URL. The portal is served
            from its own domain and never sees your API key.
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <PortalSettingsForm
            {...target}
            sandbox={environment.mode === "sandbox"}
            settings={settings}
          />
        </CardPanel>
      </Card>
    </div>
  );
}
