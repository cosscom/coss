/**
 * Makes a Domain Connect signing key, or prints the DNS records of the configured one. DNS providers
 * check every apply URL's signature against TXT records at `<key id>.coss.com` (the template's
 * `syncPubKeyDomain`), so publish them before setting the key on the dashboard (README, "Domain Connect").
 *   bun run domain-connect:key --key-id _dck2   # new key: prints the PEM (the secret) and its records
 *   bun run domain-connect:key --from-env       # records of DOMAIN_CONNECT_PRIVATE_KEY / _KEY_ID
 */
import { generateKeyPairSync } from "node:crypto";
import { parseArgs } from "node:util";
import {
  DOMAIN_CONNECT_TEMPLATE,
  domainConnectPublicKeyRecords,
  parseDomainConnectKey,
} from "../src/domain-connect.ts";

const USAGE = "Usage: bun run domain-connect:key (--key-id <_dckN> | --from-env)";

function main(): void {
  const { values } = parseArgs({
    options: { "key-id": { type: "string" }, "from-env": { type: "boolean" } },
  });
  let keyId: string | undefined;
  let pem: string | undefined;
  if (values["from-env"]) {
    keyId = process.env.DOMAIN_CONNECT_KEY_ID;
    pem = process.env.DOMAIN_CONNECT_PRIVATE_KEY;
    if (!keyId || !pem)
      throw new Error("Set DOMAIN_CONNECT_PRIVATE_KEY and DOMAIN_CONNECT_KEY_ID.");
  } else {
    keyId = values["key-id"];
    if (!keyId) throw new Error(USAGE);
    pem = generateKeyPairSync("rsa", { modulusLength: 2048 })
      .privateKey.export({ type: "pkcs8", format: "pem" })
      .toString();
    console.log("DOMAIN_CONNECT_PRIVATE_KEY (store it as a secret, never commit it):\n");
    console.log(pem);
  }
  const name = `${keyId}.${DOMAIN_CONNECT_TEMPLATE.syncPubKeyDomain}`;
  console.log(`DOMAIN_CONNECT_KEY_ID=${keyId}\n`);
  console.log(`Publish these TXT records at ${name} (one record each):\n`);
  for (const record of domainConnectPublicKeyRecords(parseDomainConnectKey(pem))) {
    console.log(record);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
