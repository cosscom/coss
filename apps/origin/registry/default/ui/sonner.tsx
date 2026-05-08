"use client";

import { useTheme } from "@teispace/next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as React.CSSProperties
      }
      theme={theme as ToasterProps["theme"]}
      toastOptions={{
        classNames: {
          description: "text-muted-foreground!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
