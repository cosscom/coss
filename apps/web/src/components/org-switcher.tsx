"use client";

import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

type OrganizationLink = { name: string; slug: string };

export function OrgSwitcher(props: {
  current: OrganizationLink;
  organizations: OrganizationLink[];
}) {
  return (
    <Menu>
      <MenuTrigger render={<Button size="sm" variant="outline" />}>
        <span className="max-w-48 truncate">{props.current.name}</span>
        <ChevronsUpDownIcon />
      </MenuTrigger>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Organizations</MenuGroupLabel>
          {props.organizations.map((org) => (
            <MenuLinkItem key={org.slug} render={<Link href={`/${org.slug}`} />}>
              <CheckIcon className={org.slug === props.current.slug ? "" : "invisible"} />
              {org.name}
            </MenuLinkItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuLinkItem render={<Link href="/onboarding" />}>
          <PlusIcon />
          New organization
        </MenuLinkItem>
      </MenuPopup>
    </Menu>
  );
}
