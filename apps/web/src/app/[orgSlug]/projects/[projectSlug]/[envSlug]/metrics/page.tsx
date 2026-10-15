import { emailMetrics } from "@coss/email";
import {
  EMAIL_METRICS,
  type EmailMetricCountsOutput,
  type EmailMetricName,
  type EmailMetricsGroupBy,
  type EmailMetricsOutput,
  MAILBOX_PROVIDER_LABELS,
  MAILBOX_PROVIDERS,
  MAX_METRICS_GROUPS,
  type MailboxProvider,
} from "@coss/email/schemas";
import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { getEnvironment } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { ChartColumnIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listHref, stringParam } from "@/components/admin/list-controls";
import { type BarColumn, type BarSeries, StackedBars } from "@/components/charts/stacked-bars";
import { ModeBadge } from "@/components/email-badges";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { Stat, StatRow } from "@/components/stat-row";
import { formatCompact } from "@/lib/format";
import { environmentPath } from "@/lib/navigation";
import { requireOrgMember } from "@/lib/session";

export const metadata: Metadata = { title: "Metrics" };

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const RANGES = [
  { value: "24h", label: "24 hours", granularity: "hour", buckets: 24 },
  { value: "7d", label: "7 days", granularity: "day", buckets: 7 },
  { value: "30d", label: "30 days", granularity: "day", buckets: 30 },
  { value: "90d", label: "90 days", granularity: "day", buckets: 90 },
  { value: "12m", label: "12 months", granularity: "day", buckets: 365 },
] as const;
type Range = (typeof RANGES)[number];

const GROUPS = [
  { value: "none", label: "Overall" },
  { value: "category", label: "Category" },
  { value: "tag", label: "Tag" },
  { value: "domain", label: "Domain" },
  { value: "mailbox_provider", label: "Mailbox provider" },
] as const satisfies readonly { value: EmailMetricsGroupBy | "none"; label: string }[];
type Group = (typeof GROUPS)[number]["value"];

const METRIC_LABELS: Record<EmailMetricName, string> = {
  sent: "Sent",
  delivered: "Delivered",
  bounced: "Bounced",
  complained: "Complained",
  opened: "Opened",
  clicked: "Clicked",
};

/** What each rate is taken over (`sent` is a count). */
const RATE_BASE: Record<EmailMetricName, EmailMetricName | null> = {
  sent: null,
  delivered: "sent",
  bounced: "sent",
  complained: "delivered",
  opened: "delivered",
  clicked: "delivered",
};

const METRIC_COLOR: Record<EmailMetricName, string> = {
  sent: "bg-foreground/72",
  delivered: "bg-foreground/72",
  bounced: "bg-destructive",
  complained: "bg-warning",
  opened: "bg-foreground/72",
  clicked: "bg-foreground/72",
};

// The largest groups get their own shade; the rest are "Other".
const GROUP_SHADES = [
  "bg-foreground/80",
  "bg-foreground/60",
  "bg-foreground/44",
  "bg-foreground/30",
  "bg-foreground/18",
];
const OTHER_SHADE = "bg-muted-foreground/24";

const CATEGORY = /^[A-Za-z0-9_-]{1,256}$/;
const DOMAIN = /^[a-z0-9.-]{1,253}$/;

const dayLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const hourLabel = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

/** `0.0123` → `"1.23%"`: small rates (complaints) need two decimals. */
function formatRate(part: number, whole: number): string {
  if (whole === 0) return "—";
  const percent = (part / whole) * 100;
  if (percent === 0 || percent >= 10) return `${Math.round(percent)}%`;
  return `${percent.toFixed(percent < 1 ? 2 : 1)}%`;
}

function rateOf(metric: EmailMetricName, counts: EmailMetricCountsOutput): string | null {
  const base = RATE_BASE[metric];
  return base ? formatRate(counts[metric], counts[base]) : null;
}

function groupLabel(groupBy: EmailMetricsGroupBy, group: string | null): string {
  if (group === null) {
    if (groupBy === "category") return "No category";
    if (groupBy === "mailbox_provider") return "Unattributed";
    return "Unknown";
  }
  if (groupBy === "mailbox_provider") {
    return MAILBOX_PROVIDER_LABELS[group as MailboxProvider] ?? group;
  }
  return group;
}

function parseTag(value: string): { name: string; value: string } | null {
  const separator = value.indexOf(":");
  if (separator < 0) return null;
  const tag = { name: value.slice(0, separator), value: value.slice(separator + 1) };
  return CATEGORY.test(tag.name) && CATEGORY.test(tag.value) ? tag : null;
}

/**
 * The chart's columns: one series, or the largest groups plus "Other" (what they leave of
 * `overall`; tags overlap, so they get no "Other").
 */
function chartOf(
  metrics: EmailMetricsOutput,
  overall: EmailMetricsOutput,
  metric: EmailMetricName,
  groupBy: EmailMetricsGroupBy | null,
): { series: BarSeries[]; columns: BarColumn[] } {
  const label = (start: string) =>
    (metrics.granularity === "hour" ? hourLabel : dayLabel).format(new Date(start));
  const buckets = overall.series[0]?.buckets ?? [];
  if (groupBy === null) {
    return {
      series: [{ key: metric, label: METRIC_LABELS[metric], className: METRIC_COLOR[metric] }],
      columns: buckets.map((bucket) => ({
        label: label(bucket.start),
        values: { [metric]: bucket[metric] },
      })),
    };
  }
  const top = metrics.series.filter((entry) => entry.totals[metric] > 0).slice(0, 5);
  const withOther = groupBy !== "tag";
  const series: BarSeries[] = top.map((entry, index) => ({
    key: `g${index}`,
    label: groupLabel(groupBy, entry.group),
    className: GROUP_SHADES[index] ?? OTHER_SHADE,
  }));
  if (withOther) series.push({ key: "other", label: "Other", className: OTHER_SHADE });
  const columns = buckets.map((bucket, at) => {
    const values: Record<string, number> = {};
    let shown = 0;
    top.forEach((entry, index) => {
      const value = entry.buckets[at]?.[metric] ?? 0;
      values[`g${index}`] = value;
      shown += value;
    });
    if (withOther) values.other = Math.max(0, bucket[metric] - shown);
    return { label: label(bucket.start), values };
  });
  const hasOther = columns.some((column) => (column.values.other ?? 0) > 0);
  return { series: hasOther ? series : series.filter((entry) => entry.key !== "other"), columns };
}

export default async function MetricsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/metrics">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const search = await searchParams;
  const { organization, can } = await requireOrgMember(orgSlug);
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found || !can({ email: ["read"] })) notFound();
  const { project, environment } = found;

  const range: Range =
    RANGES.find((option) => option.value === stringParam(search.range)) ?? RANGES[1];
  const group: Group =
    GROUPS.find((option) => option.value === stringParam(search.group))?.value ?? "none";
  const groupBy = group === "none" ? null : group;
  const metric: EmailMetricName =
    EMAIL_METRICS.find((name) => name === stringParam(search.metric)) ?? "sent";
  const categoryParam = stringParam(search.category);
  const category = CATEGORY.test(categoryParam) ? categoryParam : "";
  const domainParam = stringParam(search.domain).toLowerCase();
  const domain = DOMAIN.test(domainParam) ? domainParam : "";
  const providerParam = stringParam(search.provider);
  const provider = (MAILBOX_PROVIDERS as readonly string[]).includes(providerParam)
    ? (providerParam as MailboxProvider)
    : null;
  const tag = parseTag(stringParam(search.tag));

  const step = range.granularity === "hour" ? HOUR_MS : DAY_MS;
  const end = new Date(Math.ceil(Date.now() / step) * step);
  const query = {
    organizationId: organization.id,
    environmentId: environment.id,
    start: new Date(end.getTime() - range.buckets * step),
    end,
    granularity: range.granularity,
    category: category ? [category] : undefined,
    domain: domain ? [domain] : undefined,
    mailboxProvider: provider ? [provider] : undefined,
    tag,
  };
  const [metrics, overall] = await Promise.all([
    emailMetrics({ ...query, groupBy, limit: MAX_METRICS_GROUPS }),
    // The chart's "Other" is what the largest groups leave of the overall counts.
    groupBy && groupBy !== "tag" ? emailMetrics(query) : null,
  ]);

  const base = environmentPath(organization.slug, project.slug, environment.slug);
  const path = `${base}/metrics`;
  const state = {
    range: range.value,
    group,
    metric,
    category,
    domain,
    provider: provider ?? "",
    tag: tag ? `${tag.name}:${tag.value}` : "",
  };
  const hrefWith = (overrides: Partial<typeof state>) => {
    const next = { ...state, ...overrides };
    return listHref(path, {
      range: next.range === "7d" ? undefined : next.range,
      group: next.group === "none" ? undefined : next.group,
      metric: next.metric === "sent" ? undefined : next.metric,
      category: next.category,
      domain: next.domain,
      provider: next.provider,
      tag: next.tag,
    });
  };
  const filters = [
    category ? { label: `Category ${category}`, clear: { category: "" } } : null,
    tag ? { label: `Tag ${state.tag}`, clear: { tag: "" } } : null,
    domain ? { label: `Domain ${domain}`, clear: { domain: "" } } : null,
    provider
      ? { label: `Provider ${MAILBOX_PROVIDER_LABELS[provider]}`, clear: { provider: "" } }
      : null,
  ].filter((filter) => filter !== null);
  /** The link that narrows the page to one group (none for "no category", "unattributed"). */
  const filterHref = (value: string | null): string | null => {
    if (value === null || groupBy === null) return null;
    const filter =
      groupBy === "category"
        ? { category: value }
        : groupBy === "tag"
          ? { tag: value }
          : groupBy === "domain"
            ? { domain: value }
            : { provider: value };
    return hrefWith({ ...filter, group: "none" });
  };

  const { totals } = metrics;
  const empty = EMAIL_METRICS.every((name) => totals[name] === 0);
  const chart = chartOf(metrics, overall ?? metrics, metric, groupBy);
  const rangeLabel = `last ${range.label} · UTC`;

  return (
    <div className="flex flex-col gap-6" data-page-width="full">
      <PageHeader
        description={`What happened to the emails ${project.name} · ${environment.name} sent: recipients sent, delivered, bounced and complained, and emails opened and clicked. Counted per hour and kept for ${formatRetentionDays(RETENTION_DAYS.emailMetrics)}.`}
        meta={<ModeBadge mode={environment.mode} />}
        title="Metrics"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterLinks
          options={GROUPS.map((option) => ({
            value: option.value,
            label: option.label,
            href: hrefWith({ group: option.value }),
          }))}
          value={group}
        />
        <FilterLinks
          options={RANGES.map((option) => ({
            value: option.value,
            label: option.label,
            href: hrefWith({ range: option.value }),
          }))}
          value={range.value}
        />
      </div>

      {filters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Badge
              key={filter.label}
              render={<Link aria-label={`Remove ${filter.label}`} href={hrefWith(filter.clear)} />}
              size="lg"
              variant="outline"
            >
              {filter.label}
              <XIcon />
            </Badge>
          ))}
        </div>
      ) : null}

      <StatRow className="md:grid-cols-3 lg:grid-cols-6">
        {EMAIL_METRICS.map((name) => {
          const rate = rateOf(name, totals);
          return (
            <Stat
              className={name === metric ? "bg-accent/60" : undefined}
              detail={
                rate === null
                  ? "recipients"
                  : `${formatCompact(totals[name])} of ${formatCompact(totals[RATE_BASE[name] ?? "sent"])}`
              }
              href={hrefWith({ metric: name })}
              key={name}
              label={METRIC_LABELS[name]}
              value={rate ?? formatCompact(totals[name])}
            />
          );
        })}
      </StatRow>

      <Panel
        action={<span className="font-mono text-muted-foreground text-xs">{rangeLabel}</span>}
        title={
          groupBy
            ? `${METRIC_LABELS[metric]} by ${GROUPS.find((option) => option.value === group)?.label.toLowerCase()}`
            : METRIC_LABELS[metric]
        }
      >
        <PanelBody>
          {empty ? (
            <EmptyState
              compact
              description="Nothing was sent in this range."
              icon={ChartColumnIcon}
              title="No activity"
            />
          ) : (
            <StackedBars
              columns={chart.columns}
              label={`${METRIC_LABELS[metric]} per ${range.granularity} over the ${rangeLabel}.`}
              series={chart.series}
            />
          )}
        </PanelBody>
      </Panel>

      {groupBy && !empty ? (
        <Panel
          description={
            groupBy === "tag"
              ? "An email with several tags counts under each of them."
              : groupBy === "mailbox_provider"
                ? "By the recipient's address. Opens and clicks of emails with several recipients belong to no provider."
                : undefined
          }
          footer={
            metrics.has_more ? (
              <span className="text-muted-foreground text-sm">
                The {MAX_METRICS_GROUPS} largest groups by recipients sent.
              </span>
            ) : null
          }
          title="Breakdown"
        >
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>{GROUPS.find((option) => option.value === group)?.label}</TableHead>
                {EMAIL_METRICS.map((name) => (
                  <TableHead className="text-right" key={name}>
                    {METRIC_LABELS[name]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.series.map((entry) => {
                const href = filterHref(entry.group);
                const label = groupLabel(groupBy, entry.group);
                return (
                  <TableRow key={entry.group ?? ""}>
                    <TableCell className="max-w-72 truncate font-medium">
                      {href ? (
                        <Link className="hover:underline" href={href}>
                          {label}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{label}</span>
                      )}
                    </TableCell>
                    {EMAIL_METRICS.map((name) => {
                      const rate = rateOf(name, entry.totals);
                      return (
                        <TableCell className="text-right font-mono tabular-nums" key={name}>
                          {formatCompact(entry.totals[name])}
                          {rate !== null ? (
                            <span className="ms-2 text-muted-foreground text-xs">{rate}</span>
                          ) : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      ) : null}
    </div>
  );
}
