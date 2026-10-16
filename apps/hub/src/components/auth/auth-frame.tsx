import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import type { ReactNode } from "react";

/**
 * The sheet sign-in, sign-up and onboarding sit on: coss ui's card frame as in its `p-card-7`
 * block (the title and lede on the frame, the form in a card inside it, a footer line below).
 */
export function AuthFrame({
  title,
  lede,
  footer,
  children,
  wide = false,
}: {
  title: string;
  lede?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="container flex w-full flex-1 flex-col items-center py-12 sm:py-16">
      <CardFrame className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>
        <CardFrameHeader>
          <CardFrameTitle>{title}</CardFrameTitle>
          {lede && <CardFrameDescription>{lede}</CardFrameDescription>}
        </CardFrameHeader>
        <Card className={footer ? "rounded-b-none!" : undefined}>
          <CardPanel>{children}</CardPanel>
        </Card>
        {footer && (
          <CardFrameFooter>
            <div className="text-muted-foreground text-xs">{footer}</div>
          </CardFrameFooter>
        )}
      </CardFrame>
    </main>
  );
}
