import "./globals.css"

import type { Metadata } from "next"
import { Cal_Sans as FontHeading, Inter as FontSans } from "next/font/google"

import { SiteHeader } from "@workspace/ui/components/site-header"
import { SiteFooter } from "@workspace/ui/components/site-footer"
import { SiteCta } from "@workspace/ui/components/site-cta"
import { ThemeProvider } from "@workspace/ui/components/theme-provider"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontHeading = FontHeading({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: "400",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://coss.com/ui"
  ),
  title: "coss.com",
  description: "coss.com - the everything but AI company",  
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontHeading.variable} bg-background font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <div className="relative flex min-h-svh flex-col bg-gradient-to-b from-sidebar to-sidebar/32 [--header-height:4rem]">
            <SiteHeader />
            {children}
            <SiteCta />
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
