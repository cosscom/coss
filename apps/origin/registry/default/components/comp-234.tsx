import { useId } from "react";

import { Label } from "@/registry/default/ui/label";
import MultipleSelector, {
  type Option,
} from "@/registry/default/ui/multiselect";

const frameworks: Option[] = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
    disable: true,
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
  {
    value: "angular",
    label: "Angular",
  },
  {
    value: "vue",
    label: "Vue.js",
  },
  {
    value: "react",
    label: "React",
  },
  {
    value: "ember",
    label: "Ember.js",
  },
  {
    value: "gatsby",
    label: "Gatsby",
  },
  {
    value: "eleventy",
    label: "Eleventy",
    disable: true,
  },
  {
    value: "solid",
    label: "SolidJS",
  },
  {
    value: "preact",
    label: "Preact",
  },
  {
    value: "qwik",
    label: "Qwik",
  },
  {
    value: "alpine",
    label: "Alpine.js",
  },
  {
    value: "lit",
    label: "Lit",
  },
];

export default function Component() {
  const _id = useId();
  return (
    <div className="*:not-first:mt-2">
      <Label>Multiselect</Label>
      <MultipleSelector
        commandProps={{
          label: "Select frameworks",
        }}
        defaultOptions={frameworks}
        emptyIndicator={<p className="text-center text-sm">No results found</p>}
        hideClearAllButton
        hidePlaceholderWhenSelected
        placeholder="Select frameworks"
        value={frameworks.slice(0, 2)}
      />
      <p
        aria-live="polite"
        className="mt-2 text-muted-foreground text-xs"
        role="region"
      >
        Inspired by{" "}
        <a
          className="underline hover:text-foreground"
          href="https://shadcnui-expansions.typeart.cc/docs/multiple-selector"
          rel="noreferrer noopener nofollow"
          target="_blank"
        >
          shadcn/ui expansions
        </a>
      </p>
    </div>
  );
}
