import Link from "next/link";

import { ButtonLink } from "@/registry/default/ui/button-link";

export default function Particle() {
  return (
    <div className="flex gap-2">
      <ButtonLink href="/">Link</ButtonLink>
      <ButtonLink render={<Link href="/" />}>Next.js Link</ButtonLink>
    </div>
  );
}
