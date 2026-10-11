/** Builds the configured classifier from validated env (the worker's). */
import { aiSdkClassifier } from "./ai-sdk.ts";
import type { ContentClassifier } from "./classifier.ts";
import type { ScreeningEnv } from "./env.ts";
import { fakeClassifier } from "./fake.ts";

export {
  DEFAULT_SCREENING_MODEL,
  SCREENING_CLASSIFIERS,
  type ScreeningClassifierName,
  type ScreeningEnv,
  screeningEnvShape,
} from "./env.ts";

/** `null` with `SCREENING_CLASSIFIER=off`: nothing is screened. */
export function createClassifier(env: ScreeningEnv): ContentClassifier | null {
  switch (env.SCREENING_CLASSIFIER) {
    case "off":
      return null;
    case "fake":
      return fakeClassifier();
    case "ai":
      if (!env.AI_GATEWAY_API_KEY) {
        throw new Error("SCREENING_CLASSIFIER=ai requires AI_GATEWAY_API_KEY.");
      }
      return aiSdkClassifier({ model: env.SCREENING_MODEL, apiKey: env.AI_GATEWAY_API_KEY });
  }
}
