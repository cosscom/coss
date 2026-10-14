import { abs } from "@/lib/calendar/site";

/** Keep the shadcn placeholder literal; URL() would encode its braces. */
export const registryUrlTemplate = () => `${abs("/calendar/r/")}{name}.json`;

export const registryConfigJson = () =>
  JSON.stringify({ registries: { "@kloq": registryUrlTemplate() } }, null, 2);

export const registryIndexUrl = () => abs("/calendar/r/registry.json");
