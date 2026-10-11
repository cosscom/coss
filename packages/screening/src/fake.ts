/**
 * A network-free classifier for development and tests. A message containing
 * `[coss-test:<category>]` scores 0.99 in that category and `[coss-test:<category>:<score>]`
 * scores exactly `<score>`; everything else scores 0.01.
 */
import {
  type ClassifierVerdict,
  type ContentClassifier,
  SCREENING_CATEGORIES,
  type ScreeningCategory,
  type ScreeningContent,
} from "./classifier.ts";

const MARKER = /\[coss-test:([a-z]+)(?::([01](?:\.\d+)?))?\]/g;

export type FakeClassifierOptions = {
  /** Fixed scores for every message (missing categories score 0.01), instead of the markers. */
  scores?: Partial<Record<ScreeningCategory, number>>;
  /** Throw this error (or a generic one) instead of answering. */
  fail?: boolean | Error;
  /** Answer after this many milliseconds (honours the abort signal). */
  delayMs?: number;
};

export function fakeClassifier(
  options: FakeClassifierOptions = {},
): ContentClassifier & { readonly calls: ScreeningContent[] } {
  const calls: ScreeningContent[] = [];
  return {
    name: "fake",
    calls,
    async classify(content, signal) {
      calls.push(content);
      if (options.delayMs) await sleep(options.delayMs, signal);
      signal.throwIfAborted();
      if (options.fail) {
        throw options.fail instanceof Error ? options.fail : new Error("fake classifier failure");
      }
      return verdict(options.scores ?? markerScores(content));
    },
  };
}

function markerScores(content: ScreeningContent): Partial<Record<ScreeningCategory, number>> {
  const text = content.kind === "email" ? `${content.subject}\n${content.text}` : `${content.body}`;
  const scores: Partial<Record<ScreeningCategory, number>> = {};
  for (const [, category, score] of text.matchAll(MARKER)) {
    if ((SCREENING_CATEGORIES as readonly string[]).includes(category ?? "")) {
      scores[category as ScreeningCategory] = score === undefined ? 0.99 : Number(score);
    }
  }
  return scores;
}

function verdict(scores: Partial<Record<ScreeningCategory, number>>): ClassifierVerdict {
  const all = Object.fromEntries(
    SCREENING_CATEGORIES.map((category) => [category, scores[category] ?? 0.01]),
  ) as Record<ScreeningCategory, number>;
  return { scores: all, model: "fake", inputTokens: null };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
