/** Which messages get screened: the first ones, a few milestones, then an unpredictable sample. */
import type { ContentScreeningPolicy } from "@coss/reputation/schemas";

/**
 * Whether the organization's `sequence`-th live message (1-based) is screened. The random part
 * is what keeps a sender from timing bad content around a predictable schedule.
 */
export function shouldScreen(
  sequence: number,
  policy: Pick<ContentScreeningPolicy, "alwaysFirst" | "milestones" | "sampleRate">,
  random: () => number = Math.random,
): boolean {
  if (sequence <= policy.alwaysFirst) return true;
  if (policy.milestones.includes(sequence)) return true;
  return random() < policy.sampleRate;
}
