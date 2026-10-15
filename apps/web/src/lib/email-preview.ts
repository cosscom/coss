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
