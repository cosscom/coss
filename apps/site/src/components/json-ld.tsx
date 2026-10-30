/**
 * One <script type="application/ld+json">. Rendered from a server component in the page body,
 * which is where Google and the answer engines both look. The payloads are ours (module constants
 * and the site's own content); `<` is escaped anyway, so no text can close the script element.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD of our own content, `<` escaped
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }}
      type="application/ld+json"
    />
  );
}
