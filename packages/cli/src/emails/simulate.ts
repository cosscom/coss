/**
 * The mailbox simulator: addresses whose outcome is known in advance, in sandbox (coss.com's fake
 * provider) and live (Amazon SES), never added to the suppression list. `--simulate` sends to them.
 */
export const SIMULATOR_DOMAIN = "simulator.amazonses.com";

export const SIMULATED_OUTCOMES = {
  delivered: "success@simulator.amazonses.com",
  bounced: "bounce@simulator.amazonses.com",
  complained: "complaint@simulator.amazonses.com",
  suppressed: "suppressionlist@simulator.amazonses.com",
} as const;

export type SimulatedOutcome = keyof typeof SIMULATED_OUTCOMES;

export function isSimulatedOutcome(value: string): value is SimulatedOutcome {
  return Object.hasOwn(SIMULATED_OUTCOMES, value);
}
