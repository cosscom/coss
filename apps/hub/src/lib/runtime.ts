import "server-only";
import { env } from "@/env";
import { devinFactory } from "./factory/devin.ts";
import { fakeFactory } from "./factory/fake.ts";
import type { Factory } from "./factory/types.ts";
import { aiTriager, fakeTriager, type Triager } from "./triage.ts";

/** The configured factory and triage, built once from validated env. */
let factory: Factory | undefined;
let triager: Triager | undefined;

export function hubFactory(): Factory {
  factory ??=
    env.HUB_FACTORY === "devin" && env.DEVIN_API_KEY
      ? devinFactory({ apiKey: env.DEVIN_API_KEY, baseUrl: env.DEVIN_API_URL })
      : fakeFactory();
  return factory;
}

export function hubTriager(): Triager {
  triager ??=
    env.HUB_TRIAGE === "ai" && env.AI_GATEWAY_API_KEY
      ? aiTriager({ model: env.SCREENING_MODEL, apiKey: env.AI_GATEWAY_API_KEY })
      : fakeTriager();
  return triager;
}
