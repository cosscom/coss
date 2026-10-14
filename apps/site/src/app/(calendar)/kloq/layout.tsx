// The theme a visitor picked in the calendar's design mode (`data-kloq-theme` on <html>; the
// tokens only apply inside a `[data-kloq-root]`, which every <Kloq> is). Light and dark stay the
// site's (next-themes).
const RESTORE_THEME =
  'try{var t=localStorage.getItem("kloq-theme");if(t)document.documentElement.setAttribute("data-kloq-theme",t)}catch(e){}';

/**
 * kloq's pages (landing page, demo, tools, comparisons and docs). The page keeps
 * the site's tokens; kloq's own (its brand colour) are defined page-wide in src/styles/calendar.css.
 * The header and page frame are each route group's `SiteShell`.
 */
export default function Layout({ children }: LayoutProps<"/kloq">) {
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a constant, not user input */}
      <script dangerouslySetInnerHTML={{ __html: RESTORE_THEME }} />
      {children}
    </>
  );
}
