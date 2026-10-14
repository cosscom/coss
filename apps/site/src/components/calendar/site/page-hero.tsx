import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";
import { Eyebrow } from "./pin";
import { Row, Sheet } from "./section";

export function PageHero({
  eyebrow,
  title,
  lede,
  ledeExtra,
  aside,
  size = "default",
  standalone = false,
  children,
  className,
}: {
  /** an array becomes a dot-separated `<Eyebrow items>`; anything else renders as given */
  eyebrow?: ReactNode | ReactNode[];
  title: ReactNode;
  lede?: ReactNode;
  /** rendered under the lede, in the same cell */
  ledeExtra?: ReactNode;
  aside?: ReactNode;
  /** `sm` is the step for tool and compare-detail pages, whose titles run long */
  size?: "default" | "sm";
  /** the hero is the page's only block: close the sheet with a rule and leave section space under it */
  standalone?: boolean;
  /** more `<Row>`s inside the sheet, under the lede */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8 sm:mt-12", standalone && "mb-20 border-b sm:mb-28", className)}>
      <Sheet>
        {eyebrow && (
          <Row>
            <div className="landing-rise py-3">
              {Array.isArray(eyebrow) ? <Eyebrow items={eyebrow} /> : eyebrow}
            </div>
          </Row>
        )}
        <Row>
          <h1
            className={cn(
              "landing-rise py-5 [animation-delay:80ms] sm:py-7",
              size === "sm" ? "page-title-sm" : "page-title",
            )}
          >
            {title}
          </h1>
        </Row>
        {(lede || aside) && (
          <Row
            flush
            inner={
              aside
                ? "grid divide-y xl:grid-cols-[minmax(0,1fr)_26rem] xl:divide-x xl:divide-y-0"
                : undefined
            }
          >
            <div className="landing-rise flex flex-col gap-4 px-6 py-6 [animation-delay:160ms]">
              {lede && (
                <p className="max-w-3xl text-pretty text-lg text-muted-foreground">{lede}</p>
              )}
              {ledeExtra}
            </div>
            {aside && (
              <div className="landing-rise flex flex-col justify-center px-6 py-6 [animation-delay:200ms]">
                {aside}
              </div>
            )}
          </Row>
        )}
        {children}
      </Sheet>
    </section>
  );
}
