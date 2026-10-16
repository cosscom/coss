import { getMarketingSettingsRow } from "@coss/email";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { marketingPage } from "@/lib/marketing";
import { MarketingSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Marketing settings" };

export default async function MarketingSettingsPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/marketing">) {
  const { env, target, context } = await marketingPage(await params);
  const settings = await getMarketingSettingsRow(env);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="What this environment's marketing email says about its sender."
        title="Marketing settings"
      />
      <Panel>
        <PanelBody>
          <MarketingSettingsForm
            {...target}
            canEdit={context.can({ contact: ["update"] })}
            displayName={settings?.displayName ?? null}
            mailingAddress={settings?.mailingAddress ?? null}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
