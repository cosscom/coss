import Link from "next/link";
import { notFound } from "next/navigation";
import { ContributionGraph } from "@/components/contribution-graph";
import { InsightCharts } from "@/components/project/insight-charts";
import { UserAvatar } from "@/components/user-avatar";
import { number, tokens, usd } from "@/lib/format";
import { getProject, getUser, listPromptRequests } from "@/lib/store";
import { PROMPT_STATUSES, STATUS_LABELS } from "@/lib/types";

/** GitHub's Insights without the code: how prompts move, who ships them. */
export default async function Insights({ params }: PageProps<"/[owner]/[project]/insights">) {
  const { owner, project: slug } = await params;
  const project = getProject(owner, slug);
  if (!project) notFound();
  const all = listPromptRequests({ owner, project: slug });
  const decided = all.filter((pr) => pr.decision);
  const approved = decided.filter((pr) => pr.decision?.decision === "approved");
  const builds = all
    .filter((pr) => pr.build?.usage)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const burned = project.factoryUsage.inputTokens + project.factoryUsage.outputTokens;
  const thisWeek = builds.reduce(
    (sum, pr) => ({
      tokens:
        sum.tokens + (pr.build?.usage?.inputTokens ?? 0) + (pr.build?.usage?.outputTokens ?? 0),
      cost: sum.cost + (pr.build?.usage?.costUsd ?? 0),
    }),
    { tokens: 0, cost: 0 },
  );
  return (
    <main className="container flex w-full flex-col gap-6 py-6">
      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prompts to production" value={number(project.promptsToProduction)} />
        <Stat
          label="Approval rate"
          value={decided.length ? `${Math.round((approved.length / decided.length) * 100)}%` : "–"}
        />
        <Stat
          label="Auto-allowed"
          value={String(all.filter((pr) => pr.decision?.by === "hub").length)}
        />
        <Stat label="Median time to production" value="1h 42m" />
      </section>
      <InsightCharts
        costPerPrompt={project.factoryUsage.costUsd / Math.max(1, project.promptsToProduction)}
        perDay={Math.max(2, Math.round(project.promptsToProduction / 1800))}
        seed={`${project.owner}/${project.slug}`}
      />
      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2.5 font-medium text-sm">What the factory burned</h2>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Tokens, all time"
            value={tokens(burned)}
            hint={`${tokens(project.factoryUsage.inputTokens)} in · ${tokens(project.factoryUsage.outputTokens)} out`}
          />
          <Stat
            label="Spent, all time"
            value={usd(project.factoryUsage.costUsd)}
            hint={`${usd(project.factoryUsage.costUsd / Math.max(1, project.promptsToProduction))} per prompt to production`}
          />
          <Stat
            label="Tokens, this week"
            value={tokens(thisWeek.tokens)}
            hint={`${builds.length} builds`}
          />
          <Stat
            label="Spent, this week"
            value={usd(thisWeek.cost)}
            hint={`by ${project.factory}`}
          />
        </div>
        <table className="w-full border-t text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th className="px-4 py-2 text-left font-medium">Build</th>
              <th className="px-4 py-2 text-right font-medium">Tokens in</th>
              <th className="px-4 py-2 text-right font-medium">Tokens out</th>
              <th className="px-4 py-2 text-right font-medium">Cost</th>
              <th className="px-4 py-2 text-left font-medium max-sm:hidden">Status</th>
            </tr>
          </thead>
          <tbody>
            {builds.map((pr) => (
              <tr className="border-t" key={pr.id}>
                <td className="px-4 py-2">
                  <Link className="hover:underline" href={`/${owner}/${slug}/prompts/${pr.number}`}>
                    <span className="text-muted-foreground">#{pr.number}</span> {pr.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {tokens(pr.build?.usage?.inputTokens ?? 0)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {tokens(pr.build?.usage?.outputTokens ?? 0)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {usd(pr.build?.usage?.costUsd ?? 0)}
                </td>
                <td className="px-4 py-2 text-muted-foreground max-sm:hidden">
                  {STATUS_LABELS[pr.status]}
                </td>
              </tr>
            ))}
            {builds.length === 0 && (
              <tr className="border-t">
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  No builds yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2.5 font-medium text-sm">
          Prompts to production, last year
        </h2>
        <div className="overflow-x-auto px-4 py-4">
          <ContributionGraph seed={project.slug} total={project.promptsToProduction} weeks={52} />
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-2.5 font-medium text-sm">By status</h2>
          <dl className="flex flex-col px-4 py-2">
            {PROMPT_STATUSES.map((status) => (
              <div className="flex items-baseline gap-3 py-1.5 text-sm" key={status}>
                <dt>{STATUS_LABELS[status]}</dt>
                <span aria-hidden className="leader" />
                <dd className="font-mono text-xs">
                  {all.filter((pr) => pr.status === status).length}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-2.5 font-medium text-sm">Top contributors</h2>
          <ol className="flex flex-col px-4 py-2">
            {project.contributors.slice(0, 8).map((contributor, index) => (
              <li className="flex items-center gap-3 py-1.5 text-sm" key={contributor.handle}>
                <span className="w-4 font-mono text-muted-foreground text-xs">{index + 1}</span>
                <UserAvatar className="size-6" handle={contributor.handle} />
                <Link className="hover:underline" href={`/${contributor.handle}`}>
                  {getUser(contributor.handle)?.name ?? contributor.handle}
                </Link>
                <span aria-hidden className="leader" />
                <span className="font-mono text-xs">{number(contributor.prompts)} prompts</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-background px-4 py-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-2xl tracking-[-0.02em]">{value}</span>
      {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
