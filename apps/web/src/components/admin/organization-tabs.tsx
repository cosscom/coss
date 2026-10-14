"use client";

import { CreditCardIcon, GaugeIcon, LayoutDashboardIcon } from "lucide-react";
import type { NavItem } from "@/lib/navigation";
import { SubNav } from "../sub-nav";

const TABS: NavItem[] = [
  { label: "Overview", path: "", icon: LayoutDashboardIcon, exact: true },
  { label: "Billing", path: "/billing", icon: CreditCardIcon },
  { label: "Sending reputation", path: "/reputation", icon: GaugeIcon },
];

/** The pages of one organization in the admin console. */
export function AdminOrganizationTabs({ organizationId }: { organizationId: string }) {
  return <SubNav base={`/admin/organizations/${organizationId}`} items={TABS} />;
}
