/**
 * coss.com's own emails (account emails, notifications to owners and admins): one layout, built
 * from typed blocks, rendered to a plain-text part and an HTML part that say the same thing.
 * Zero dependencies and no I/O, so any package can render with it (auth included).
 *
 * Every string is text, never markup: the renderer escapes it. Names that come from customers
 * (organizations, businesses) go through `oneLine` before they reach a subject.
 */

/** A step of a process the email reports on (a registration's review, a DMARC rollout). */
export type EmailStep = {
  label: string;
  detail?: string;
  state: "done" | "current" | "upcoming" | "failed";
};

export type EmailBlock =
  /** A section heading inside the email (the email's own title is `title`). */
  | { heading: string }
  | { paragraph: string }
  | { list: string[] }
  /** The email's call to action: a button. Use one per email. */
  | { button: { label: string; url: string } }
  /** A secondary link, as text. */
  | { link: { label: string; url: string } }
  /** Something to copy (a DNS record, an SDK call), in a monospaced box. */
  | { code: string }
  /** Label/value pairs (a number, a business, a date). */
  | { details: { label: string; value: string }[] }
  | { steps: EmailStep[] }
  /** Small print under the main content. */
  | { note: string };

export type EmailMessage = { subject: string; text: string; html: string };

export type EmailContent = {
  subject: string;
  /** The heading at the top of the email; defaults to the subject. */
  title?: string;
  /** The inbox preview line (hidden in the body); defaults to the first paragraph. */
  preview?: string;
  blocks: EmailBlock[];
  /** Why the recipient gets this email, under the content. */
  reason?: string;
};

/** Customer-provided text on one line: no control or separator characters, single spaces. */
export function oneLine(value: string): string {
  return value
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmail(content: EmailContent): EmailMessage {
  const subject = oneLine(content.subject);
  return { subject, text: toText(content), html: toHtml(subject, content) };
}

// ---------------------------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------------------------

const STEP_MARK = { done: "[x]", current: "[>]", upcoming: "[ ]", failed: "[!]" } as const;

function blockText(block: EmailBlock): string {
  if ("heading" in block) return block.heading.toUpperCase();
  if ("paragraph" in block) return block.paragraph;
  if ("list" in block) return block.list.map((item) => `- ${item}`).join("\n");
  if ("button" in block) return `${block.button.label}: ${block.button.url}`;
  if ("link" in block) return `${block.link.label}: ${block.link.url}`;
  if ("code" in block) return block.code;
  if ("details" in block) {
    return block.details.map((row) => `${row.label}: ${row.value}`).join("\n");
  }
  if ("steps" in block) {
    return block.steps
      .map(
        (step, index) =>
          `${STEP_MARK[step.state]} ${index + 1}. ${step.label}${step.detail ? ` (${step.detail})` : ""}`,
      )
      .join("\n");
  }
  return block.note;
}

function toText(content: EmailContent): string {
  const parts = [content.title ?? content.subject, ...content.blocks.map(blockText)];
  if (content.reason) parts.push(`--\n${content.reason}`);
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// HTML: tables and inline styles only (what every mail client renders), grayscale like the site.
// ---------------------------------------------------------------------------------------------

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const INK = "#18181b";
const MUTED = "#71717a";
const BORDER = "#e4e4e7";
const TRAY = "#f4f4f5";

const STEP_DOT = {
  done: { mark: "&#10003;", color: "#ffffff", background: INK, border: INK },
  current: { mark: "&#9679;", color: INK, background: "#ffffff", border: INK },
  upcoming: { mark: "", color: MUTED, background: "#ffffff", border: BORDER },
  failed: { mark: "&#10005;", color: "#ffffff", background: "#b91c1c", border: "#b91c1c" },
} as const;

function paragraph(html: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK};${style}">${html}</p>`;
}

function blockHtml(block: EmailBlock): string {
  if ("heading" in block) {
    return `<h2 style="margin:24px 0 8px;font-size:15px;line-height:22px;font-weight:600;color:${INK}">${escapeHtml(block.heading)}</h2>`;
  }
  if ("paragraph" in block) return paragraph(escapeHtml(block.paragraph));
  if ("list" in block) {
    const items = block.list
      .map((item) => `<li style="margin:0 0 4px">${escapeHtml(item)}</li>`)
      .join("");
    return `<ul style="margin:0 0 16px;padding:0 0 0 20px;font-size:15px;line-height:24px;color:${INK}">${items}</ul>`;
  }
  if ("button" in block) {
    const url = escapeHtml(block.button.url);
    return (
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr>` +
      `<td style="border-radius:8px;background:${INK}">` +
      `<a href="${url}" style="display:inline-block;padding:10px 18px;font-family:${FONT};font-size:14px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(block.button.label)}</a>` +
      `</td></tr></table>`
    );
  }
  if ("link" in block) {
    return paragraph(
      `<a href="${escapeHtml(block.link.url)}" style="color:${INK};text-decoration:underline">${escapeHtml(block.link.label)}</a>`,
    );
  }
  if ("code" in block) {
    return `<pre style="margin:0 0 16px;padding:12px 14px;border:1px solid ${BORDER};border-radius:8px;background:${TRAY};font-family:${MONO};font-size:13px;line-height:20px;color:${INK};white-space:pre-wrap;word-break:break-all"><code>${escapeHtml(block.code)}</code></pre>`;
  }
  if ("details" in block) {
    const rows = block.details
      .map(
        (row, index) =>
          `<tr><td style="padding:10px 14px;${index ? `border-top:1px solid ${BORDER};` : ""}font-size:14px;line-height:20px;color:${MUTED};white-space:nowrap;vertical-align:top">${escapeHtml(row.label)}</td>` +
          `<td style="padding:10px 14px;${index ? `border-top:1px solid ${BORDER};` : ""}font-size:14px;line-height:20px;color:${INK};word-break:break-word">${escapeHtml(row.value)}</td></tr>`,
      )
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${BORDER};border-radius:8px;border-collapse:separate">${rows}</table>`;
  }
  if ("steps" in block) {
    const rows = block.steps
      .map((step) => {
        const dot = STEP_DOT[step.state];
        const label = step.state === "upcoming" ? MUTED : INK;
        return (
          `<tr><td style="width:22px;padding:0 12px 14px 0;vertical-align:top">` +
          `<div style="width:20px;height:20px;border:1px solid ${dot.border};border-radius:10px;background:${dot.background};color:${dot.color};font-size:11px;line-height:20px;text-align:center">${dot.mark}</div></td>` +
          `<td style="padding:0 0 14px;vertical-align:top">` +
          `<div style="font-size:14px;line-height:20px;font-weight:600;color:${label}">${escapeHtml(step.label)}</div>` +
          (step.detail
            ? `<div style="font-size:13px;line-height:20px;color:${MUTED}">${escapeHtml(step.detail)}</div>`
            : "") +
          `</td></tr>`
        );
      })
      .join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 12px">${rows}</table>`;
  }
  return paragraph(escapeHtml(block.note), `font-size:13px;line-height:20px;color:${MUTED}`);
}

function toHtml(subject: string, content: EmailContent): string {
  const firstParagraph = content.blocks.find((block) => "paragraph" in block);
  const preview =
    content.preview ??
    (firstParagraph && "paragraph" in firstParagraph ? firstParagraph.paragraph : "");
  const title = content.title ?? subject;
  const body = content.blocks.map(blockHtml).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${TRAY};font-family:${FONT};color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TRAY}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.02em;color:${INK}">coss.com</td></tr>
<tr><td style="padding:32px;border:1px solid ${BORDER};border-radius:12px;background:#ffffff;font-family:${FONT}">
<h1 style="margin:0 0 16px;font-size:20px;line-height:28px;font-weight:600;letter-spacing:-0.01em;color:${INK}">${escapeHtml(title)}</h1>
${body}
</td></tr>
${
  content.reason
    ? `<tr><td style="padding:16px 4px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED}">${escapeHtml(content.reason)}</td></tr>`
    : ""
}
</table>
</td></tr>
</table>
</body>
</html>`;
}
