import { AnchorIcon, FactoryIcon } from "lucide-react";
import { DevinLogo } from "./coss-landing/factory-logos";

/** The mark of the factory a project builds with: Devin's, Shipyard's anchor, else a factory. */
export function FactoryLogo({ name, className }: { name: string; className?: string }) {
  if (/devin/i.test(name)) return <DevinLogo className={className} />;
  if (/shipyard/i.test(name))
    return <AnchorIcon aria-hidden className={className} strokeWidth={1.5} />;
  return <FactoryIcon aria-hidden className={className} strokeWidth={1.5} />;
}
