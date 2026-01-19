"use client";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <SettingsSidebar />
      <SidebarInset>
        <div className="mx-auto max-w-3xl">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
