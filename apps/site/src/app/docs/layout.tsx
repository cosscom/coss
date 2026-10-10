import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { AccountLinks } from "@/components/account-links";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  // Top-level folders with `"root": true` in their meta.json become the sidebar tabs.
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      sidebar={{ banner: <AccountLinks /> }}
    >
      {children}
    </DocsLayout>
  );
}
