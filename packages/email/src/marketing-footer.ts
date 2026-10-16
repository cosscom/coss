/**
 * What every marketing email carries (CAN-SPAM, and Gmail/Yahoo's bulk sender rules): the
 * sender's postal address and a working unsubscribe link. Templates place them with
 * `{{{unsubscribe_url}}}`, `{{{preferences_url}}}` and `{{{mailing_address}}}`; anything missing
 * is added in a footer. Applied to the provider's copy only, splicing the original string (the
 * stored email keeps what was sent to the API).
 */

export const UNSUBSCRIBE_PLACEHOLDER = "{{{unsubscribe_url}}}";
export const PREFERENCES_PLACEHOLDER = "{{{preferences_url}}}";
export const MAILING_ADDRESS_PLACEHOLDER = "{{{mailing_address}}}";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type FooterValues = {
  unsubscribeUrl: string;
  preferencesUrl: string;
  mailingAddress: string;
};

function hasLink(content: string): boolean {
  return content.includes(UNSUBSCRIBE_PLACEHOLDER) || content.includes(PREFERENCES_PLACEHOLDER);
}

function fill(content: string, values: Record<string, string>): string {
  let filled = content;
  for (const [placeholder, value] of Object.entries(values)) {
    // A callback, so `$&`-style sequences in the value stay literal.
    filled = filled.replaceAll(placeholder, () => value);
  }
  return filled;
}

function htmlFooter(values: FooterValues, parts: { address: boolean; links: boolean }): string {
  const lines: string[] = [];
  if (parts.address) {
    lines.push(escapeHtml(values.mailingAddress).replaceAll("\n", "<br>"));
  }
  if (parts.links) {
    lines.push(
      `<a href="${escapeHtml(values.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a> · ` +
        `<a href="${escapeHtml(values.preferencesUrl)}" style="color:#6b7280">Manage preferences</a>`,
    );
  }
  return (
    '<div style="margin-top:32px;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;color:#6b7280">' +
    `${lines.join("<br>")}</div>`
  );
}

/** Inserts `footer` before the last `</body>` (or appends it). */
function beforeBodyEnd(html: string, footer: string): string {
  const index = html.toLowerCase().lastIndexOf("</body>");
  return index === -1 ? `${html}${footer}` : `${html.slice(0, index)}${footer}${html.slice(index)}`;
}

/** The HTML and text with the placeholders filled in and, if needed, the footer added. */
export function applyMarketingFooter(
  content: { html: string | null; text: string | null },
  values: FooterValues,
): { html: string | null; text: string | null } {
  let html = content.html;
  if (html !== null) {
    const links = !hasLink(html);
    const address = !html.includes(MAILING_ADDRESS_PLACEHOLDER);
    html = fill(html, {
      [UNSUBSCRIBE_PLACEHOLDER]: escapeHtml(values.unsubscribeUrl),
      [PREFERENCES_PLACEHOLDER]: escapeHtml(values.preferencesUrl),
      [MAILING_ADDRESS_PLACEHOLDER]: escapeHtml(values.mailingAddress).replaceAll("\n", "<br>"),
    });
    if (links || address) html = beforeBodyEnd(html, htmlFooter(values, { address, links }));
  }
  let text = content.text;
  if (text !== null) {
    const links = !hasLink(text);
    const address = !text.includes(MAILING_ADDRESS_PLACEHOLDER);
    text = fill(text, {
      [UNSUBSCRIBE_PLACEHOLDER]: values.unsubscribeUrl,
      [PREFERENCES_PLACEHOLDER]: values.preferencesUrl,
      [MAILING_ADDRESS_PLACEHOLDER]: values.mailingAddress,
    });
    if (links || address) {
      const lines = [
        ...(address ? [values.mailingAddress] : []),
        ...(links
          ? [
              `Unsubscribe: ${values.unsubscribeUrl}`,
              `Manage preferences: ${values.preferencesUrl}`,
            ]
          : []),
      ];
      text = `${text}\n\n--\n${lines.join("\n")}\n`;
    }
  }
  return { html, text };
}
