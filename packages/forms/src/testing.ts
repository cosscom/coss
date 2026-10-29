/** Test helpers: a file store that keeps bytes in Postgres, and form checks without a provider. */
import type { FormChecks, FormLinks } from "./forms.ts";

export { FakeFormFileStore } from "./store.ts";

/** Where tests' forms are served. */
export const TEST_FORM_LINKS: FormLinks = { publicUrl: "https://forms.coss.test" };

/** Addresses on these domains count as verified (default: none). */
export function testFormChecks(verifiedDomains: string[] = []): FormChecks {
  return {
    async verifiedAddress({ address }) {
      const domain = address.slice(address.lastIndexOf("@") + 1).toLowerCase();
      return verifiedDomains.includes(domain);
    },
  };
}
