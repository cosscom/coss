import type { Metadata } from "next";
import { Booker } from "@/registry/default/atoms/booker-1";

export const metadata: Metadata = {
  title: "Booker Playground - coss ui",
};

export default function BookerPlaygroundPage() {
  return (
    <main className="container flex min-h-svh w-full items-center py-10">
      <Booker
        target={{
          bookingUrl: "https://i.cal.com/pasquale/15min",
          type: "link",
        }}
      />
    </main>
  );
}
