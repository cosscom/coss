import { fontCalSans } from "@coss/ui/fonts";
import { JetBrains_Mono } from "next/font/google";

// Shipyard's own faces, for the landing page and its docs: Cal Sans for the headlines, JetBrains
// Mono as at berthd.app (the body sans is the site's Inter).
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export default function Layout({ children }: LayoutProps<"/shipyard">) {
  return (
    <div className={`${fontCalSans.variable} ${mono.variable} flex flex-1 flex-col`}>
      {children}
    </div>
  );
}
