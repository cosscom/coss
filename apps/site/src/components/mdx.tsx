import * as Twoslash from "fumadocs-twoslash/ui";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ApiChangelog } from "./api-changelog";
import { PlanTable, UsageRates } from "./billing";
import { RetentionPeriod, RetentionTable } from "./retention";

/** Components available in every MDX page without an import. */
export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...Twoslash,
    ApiChangelog,
    PlanTable,
    RetentionPeriod,
    RetentionTable,
    Step,
    Steps,
    Tab,
    Tabs,
    UsageRates,
    ...components,
  } satisfies MDXComponents;
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
