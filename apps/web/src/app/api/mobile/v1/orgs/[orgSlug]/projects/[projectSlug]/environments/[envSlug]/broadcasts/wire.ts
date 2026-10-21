import type { BroadcastEmail, MobileBroadcast, MobileBroadcastSummary } from "@coss/companion";
import { applyMarketingFooter, renderBroadcast } from "@coss/email";
import type { BroadcastOutput } from "@coss/email/broadcast-schemas";
import type { EmailObjectOutput } from "@coss/email/schemas";

export function toMobileBroadcastSummary(broadcast: BroadcastOutput): MobileBroadcastSummary {
  const { stats } = broadcast;
  return {
    id: broadcast.id,
    name: broadcast.name,
    status: broadcast.status,
    stats: {
      recipients: stats.recipients,
      delivered: stats.delivered,
      opened: stats.opened,
      clicked: stats.clicked,
    },
    tracking: { opens: broadcast.tracking.opens, clicks: broadcast.tracking.clicks },
    updated_at: broadcast.updated_at,
  };
}

/**
 * The dashboard's preview (broadcasts/[broadcastId]/page.tsx): the template with its fallbacks,
 * the footer and links that go nowhere. Only the subject and the text part reach the app.
 */
function preview(
  broadcast: BroadcastOutput,
  mailingAddress: string,
  fallbacks: Record<string, string>,
) {
  const rendered = renderBroadcast(
    {
      subject: broadcast.subject,
      html: broadcast.html,
      text: broadcast.text,
      previewText: broadcast.preview_text,
    },
    fallbacks,
  );
  return {
    subject: rendered.subject,
    ...applyMarketingFooter(rendered, {
      unsubscribeUrl: "#unsubscribe",
      preferencesUrl: "#preferences",
      mailingAddress: mailingAddress || "(your postal address)",
    }),
  };
}

export function toMobileBroadcast(
  broadcast: BroadcastOutput,
  extra: {
    target: MobileBroadcast["target"];
    planRate: number;
    reachEstimate: number | null;
    mailingAddress: string | null;
    fallbacks: Record<string, string>;
  },
): MobileBroadcast {
  const shown = preview(broadcast, extra.mailingAddress ?? "", extra.fallbacks);
  const { stats } = broadcast;
  return {
    id: broadcast.id,
    name: broadcast.name,
    status: broadcast.status,
    target: extra.target,
    topic: broadcast.topic,
    from: broadcast.from,
    reply_to: broadcast.reply_to,
    preview_text: broadcast.preview_text,
    tracking: { opens: broadcast.tracking.opens, clicks: broadcast.tracking.clicks },
    rate_per_second: broadcast.rate_per_second ?? extra.planRate,
    scheduled_at: broadcast.scheduled_at,
    started_at: broadcast.started_at,
    finished_at: broadcast.completed_at ?? broadcast.canceled_at,
    updated_at: broadcast.updated_at,
    recipients_estimated: broadcast.recipients_estimated,
    pause_reason: broadcast.pause_reason,
    error: broadcast.error
      ? { code: broadcast.error.code, message: broadcast.error.message }
      : null,
    stats: {
      recipients: stats.recipients,
      sent: stats.sent,
      delivered: stats.delivered,
      bounced: stats.bounced,
      complained: stats.complained,
      failed: stats.failed,
      opened: stats.opened,
      clicked: stats.clicked,
      unsubscribed: stats.unsubscribed,
    },
    reach_estimate: extra.reachEstimate,
    mailing_address_missing: broadcast.status === "draft" && !extra.mailingAddress,
    preview_subject: shown.subject,
    preview_text_body: shown.text,
    has_html: shown.html !== null,
  };
}

export function toBroadcastEmail(email: EmailObjectOutput): BroadcastEmail {
  return {
    id: email.id,
    to: email.to[0] ?? "",
    status: email.status,
    created_at: email.created_at,
  };
}
