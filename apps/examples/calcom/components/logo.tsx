import Link from "next/link";
import type * as React from "react";

type LogoProps = Omit<React.ComponentPropsWithoutRef<typeof Link>, "href">;

export function Logo(props: LogoProps): React.ReactElement {
  return (
    <Link href="/" {...props}>
      <h1 className="font-heading font-semibold text-foreground text-xl leading-none md:text-base lg:text-lg">
        Cal<span className="md:max-lg:sr-only">.com</span>
      </h1>
    </Link>
  );
}
