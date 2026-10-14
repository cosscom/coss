/**
 * One <script type="application/ld+json">. Rendered from a server component in
 * the page body, which is where Google and the answer engines both look.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // the payloads are ours, built from module constants — no user input reaches this
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
