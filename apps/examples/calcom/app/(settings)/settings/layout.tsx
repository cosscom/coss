"use client";

import { SettingsMobileHeader } from "@/components/settings/settings-mobile-header";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <SettingsMobileHeader />
      <SettingsSidebar />
      <SidebarInset className="max-md:pt-14">
        <div className="mx-auto max-w-3xl">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
