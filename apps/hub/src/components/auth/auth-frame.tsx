import type { ReactNode } from "react";

/** The narrow sheet sign-in, sign-up and onboarding sit on. */
export function AuthFrame({
  title,
  lede,
  children,
  wide = false,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="container flex w-full flex-1 flex-col items-center py-12 sm:py-16">
      <div
        className={
          wide ? "flex w-full max-w-2xl flex-col gap-6" : "flex w-full max-w-sm flex-col gap-6"
        }
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-3xl tracking-[-0.03em]">{title}</h1>
          {lede && <p className="text-muted-foreground">{lede}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
