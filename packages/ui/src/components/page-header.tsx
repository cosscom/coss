import { cn } from "@coss/ui/lib/utils";

function PageHeader({
  className,
  children,
}: React.ComponentProps<"section">) {
  return (
    <section>
      <div className="container-wrapper">
        <div className={cn("container flex flex-col items-center gap-2 px-0 py-8 text-center md:py-12 lg:py-16 xl:gap-4", className)}>
          {children}
        </div>
      </div>
    </section>
  );
}

function PageHeaderHeading({
  className,
  children,
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn("font-heading text-4xl lg:text-5xl", className)}
    >
      {children}
    </h1>
  );
}

function PageHeaderDescription({
  className,
  children,
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground lg:text-lg", className)}
    >
      {children}
    </p>
  );
}

export { PageHeader, PageHeaderDescription, PageHeaderHeading };
