import "server-only";
import {
  type ContactEnvironment,
  listAudiences,
  listContactPropertyRows,
  listSegments,
  listTopicRows,
} from "@coss/email";
import type { BroadcastOutput } from "@coss/email/broadcast-schemas";
import { BUCKETS } from "@coss/ratelimit";
import { planRules } from "@/lib/billing";
import type { BroadcastDraft } from "./broadcast-editor";

/** What the editor offers: the environment's audiences, segments, topics and variables. */
export async function broadcastEditorData(env: ContactEnvironment) {
  const [audiences, segments, topics, properties, rules] = await Promise.all([
    listAudiences(env, { limit: 100 }),
    listSegments(env, { limit: 100 }),
    listTopicRows(env),
    listContactPropertyRows(env),
    planRules(env.organizationId),
  ]);
  const rule =
    rules["email.marketing.recipients.second"] ?? BUCKETS["email.marketing.recipients.second"];
  return {
    audiences: audiences.data.map((audience) => ({ value: audience.id, label: audience.name })),
    segments: segments.data.map((segment) => ({ value: segment.id, label: segment.name })),
    topics: topics.map((topic) => ({ value: topic.key, label: topic.name })),
    variables: ["email", "first_name", "last_name", ...properties.map((property) => property.key)],
    planRate: Math.max(1, Math.floor((rule.limit * 1000) / rule.periodMs)),
  };
}

/** A broadcast as the editor's fields. */
export function draftOf(broadcast: BroadcastOutput): BroadcastDraft {
  return {
    name: broadcast.name,
    target: broadcast.audience_id ?? broadcast.segment_id ?? "",
    topic: broadcast.topic ?? "",
    from: broadcast.from,
    replyTo: broadcast.reply_to.join(", "),
    subject: broadcast.subject,
    previewText: broadcast.preview_text ?? "",
    html: broadcast.html ?? "",
    text: broadcast.text ?? "",
    trackOpens: broadcast.tracking.opens,
    trackClicks: broadcast.tracking.clicks,
    ratePerSecond: broadcast.rate_per_second === null ? "" : String(broadcast.rate_per_second),
  };
}
