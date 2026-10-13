import "./landing.css";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { SiteFooter } from "@/components/site-footer";
import { baseOptions } from "@/lib/layout.shared";
import { SHIPYARD_LINKS } from "@/lib/shipyard";

// The landing page (the fonts come from ../layout.tsx, the page's styles from ./landing.css).
export default function Layout({ children }: LayoutProps<"/shipyard">) {
  return (
    <HomeLayout {...baseOptions()} links={SHIPYARD_LINKS}>
      {children}
      <SiteFooter />
    </HomeLayout>
  );
}
