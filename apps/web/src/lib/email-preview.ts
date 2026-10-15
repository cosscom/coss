/**
 * Prepended to customer HTML so the parser places it in <head>. Together with `sandbox=""`
 * (no scripts, forms, popups or same-origin access) it blocks every network load except
 * images and fonts, and stops the dashboard URL from leaking via Referer.
 * NEVER add `allow-scripts` or `allow-same-origin` to the iframe. Used by sent emails and the
 * template editor's live preview.
 */
export const PREVIEW_HEAD =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src data: https:">` +
  `<meta name="referrer" content="no-referrer">`;

/**
 * The same for HTML written by someone COSS doesn't trust to know who looks at it: received email
 * (anyone on the internet) and customer email opened by a platform admin (an abuse investigation
 * must not tell the sender). It may load nothing at all, not even remote images: a tracking pixel
 * would tell the sender the email was opened, and from where. Only inline `data:` images and fonts
 * render. NEVER add `allow-scripts` or `allow-same-origin` to the iframe.
 */
export const UNTRUSTED_PREVIEW_HEAD =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">` +
  `<meta name="referrer" content="no-referrer">`;
