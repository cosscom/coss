import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { AccountLinks } from "@/components/account-links";
import { SITE_NAME } from "./site";

/** Navigation shared by the landing page and the docs. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <span className="font-semibold tracking-tight">{SITE_NAME}</span>,
      url: "/",
    },
  };
}

/** Header links of the landing page. In the docs, the sidebar tabs cover the sections. */
export const homeLinks: BaseLayoutProps["links"] = [
  { text: "Pricing", url: "/pricing" },
  { text: "Docs", url: "/docs" },
  { text: "API Reference", url: "/docs/api-reference" },
  { type: "custom", secondary: true, children: <AccountLinks /> },
];
