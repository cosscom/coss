import type { Registry } from "shadcn/schema";

const calApiFiles: Registry["items"][number]["files"] = [
  {
    path: "lib/cal-api/client.ts",
    target: "lib/cal-api/client.ts",
    type: "registry:lib",
  },
  {
    path: "lib/cal-api/env.ts",
    target: "lib/cal-api/env.ts",
    type: "registry:lib",
  },
  {
    path: "lib/cal-api/event-types.ts",
    target: "lib/cal-api/event-types.ts",
    type: "registry:lib",
  },
  {
    path: "lib/cal-api/public-event.ts",
    target: "lib/cal-api/public-event.ts",
    type: "registry:lib",
  },
  {
    path: "lib/cal-api/slots.ts",
    target: "lib/cal-api/slots.ts",
    type: "registry:lib",
  },
  {
    path: "lib/cal-api/types.ts",
    target: "lib/cal-api/types.ts",
    type: "registry:lib",
  },
];

export const cal: Registry["items"] = [
  {
    dependencies: ["server-only"],
    description: "Cal.com API v2 client for server-side requests.",
    files: calApiFiles,
    name: "cal-api",
    type: "registry:lib",
  },
];
