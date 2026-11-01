import { buildSeedEvents, Kloq, KloqToolbar } from "../src/index.ts";

const events = buildSeedEvents(new Date("2026-08-03T12:00:00"));

/** Drop-in screen. Run it from an Expo app that depends on expo-kloq. */
export function App() {
  return (
    <Kloq defaultView="week" defaultDate={new Date("2026-08-03T12:00:00")} defaultEvents={events}>
      <KloqToolbar />
    </Kloq>
  );
}
