import type { Metadata } from "next";
import { Booker } from "@/registry/default/atoms/booker-1";
import { fetchRawBookerDataAction } from "@/lib/booker/actions";
import type { BookerTarget } from "@/lib/booker/target";

export const metadata: Metadata = {
  title: "Booker Playground - coss ui",
};

const target = {
  bookingUrl: "https://i.cal.com/pasquale/15min",
  type: "link",
} satisfies BookerTarget;
const timeZone = "Europe/Rome";

export default async function BookerPlaygroundPage() {
  const initialInput = {
    fetchMeta: true,
    monthIso: new Date().toISOString(),
    monthsToFetch: 3,
    target,
    timeZone,
  };
  const initialData = {
    monthIso: initialInput.monthIso,
    monthsToFetch: initialInput.monthsToFetch,
    result: await fetchRawBookerDataAction(initialInput),
    timeZone: initialInput.timeZone,
  };

  return (
    <main className="container flex min-h-svh w-full items-center py-10">
      <Booker initialData={initialData} target={target} />
    </main>
  );
}
