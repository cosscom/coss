"use client";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <SettingsSidebar />
      <main className="flex-1 bg-background pl-56 max-lg:pl-0">
        <div className="mx-auto max-w-3xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
