/**
 * Assesses a few sign-ups through the SDK.
 *
 *   COSS_API_KEY=coss_test_… COSS_BASE_URL=http://localhost:3001 bun packages/sdk/examples/risk-assess.ts
 *
 * With a sandbox (`coss_test_…`) key the documented test inputs apply: `192.0.2.1` is a Tor exit,
 * `192.0.2.2` a cloud server, `192.0.2.3` a VPN, other `192.0.2.x` addresses a home connection;
 * `@disposable.test` is a disposable domain and `@undeliverable.test` can't receive mail.
 */
import { Coss } from "../src/index.ts";

const coss = new Coss({
  apiKey: process.env.COSS_API_KEY,
  baseUrl: process.env.COSS_BASE_URL,
});

const signups = [
  { email: "ada@gmail.con", ip: "192.0.2.9" },
  { email: "x@disposable.test", ip: "192.0.2.2" },
  { email: "x@disposable.test", ip: "192.0.2.1" },
];

for (const { email, ip } of signups) {
  const { data, error } = await coss.risk.assess({
    event: "signup",
    user: { email },
    ip,
    user_agent: "Mozilla/5.0 (risk-assess example)",
  });
  if (error) {
    // In a real sign-up flow, fail open: let the user in and log the error.
    console.error(error);
    process.exit(1);
  }
  console.log(`${email} from ${ip}: ${data.decision} (score ${data.score})`);
  for (const reason of data.reasons) console.log(`  ${reason.code}: ${reason.message}`);
}
