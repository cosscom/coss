import { Button, type ButtonProps } from "@coss/ui/components/button";
import Link from "next/link";
import { CTA, type Cta } from "./tiers";

type CopyKey = Exclude<keyof Cta, "href" | "installHref" | "heroHref">;

/** One shared piece of installation copy. */
export async function PlanCopy({ of }: { of: CopyKey }) {
  const cta = CTA;
  return <>{cta[of]}</>;
}

/** The install action and its destination. */
export async function InstallCta(props: Omit<ButtonProps, "render" | "children">) {
  const cta = CTA;
  return (
    <Button {...props} render={<Link href={cta.installHref} />}>
      {cta.installCta}
    </Button>
  );
}

/** The source documentation action and its destination. */
export async function SourceCta(props: Omit<ButtonProps, "render" | "children">) {
  const cta = CTA;
  return (
    <Button {...props} render={<Link href={cta.href} />}>
      {cta.label}
    </Button>
  );
}
