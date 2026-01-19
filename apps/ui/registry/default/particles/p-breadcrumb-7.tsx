import { DatabaseIcon } from "lucide-react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/registry/default/ui/breadcrumb";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

const items = [
  { label: "Orion", value: "orion" },
  { label: "Sigma", value: "sigma" },
  { label: "Dorado", value: "dorado" },
];

export default function Particle() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/" />}>Databases</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <Select defaultValue="orion" items={items}>
            <SelectTrigger
              aria-label="Select database"
              className="relative gap-2 ps-9"
              size="sm"
            >
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 group-has-[select[disabled]]:opacity-50">
                <DatabaseIcon aria-hidden="true" className="size-4" />
              </div>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {items.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
