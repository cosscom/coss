/**
 * Seals a test PDF with this environment's sealer and TSA (`SIGN_SEALER`, `SIGN_SEAL_*`,
 * `SIGN_CSC_*`, `SIGN_TSA_URL`), validation data included, to open in Acrobat before switching
 * Sign on: the signer and the timestamp should show as trusted, and the signature as LTV enabled.
 *
 *   bun run --cwd packages/sign seal:test --out /tmp/sealed.pdf
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { PDFDocument } from "pdf-lib";
import { sealerFromEnv } from "../src/runtime.ts";
import { pkijs } from "../src/seal/crypto.ts";
import { sealPdf } from "../src/seal/pdf-signature.ts";
import { buildTestPdf } from "../src/testing.ts";

const { values } = parseArgs({ options: { out: { type: "string" } } });
if (!values.out) {
  console.error("usage: seal:test --out <file.pdf>");
  process.exit(2);
}
const built = await sealerFromEnv({
  ...process.env,
  SIGN_SEALER: process.env.SIGN_SEALER as "kms" | "csc" | "local" | undefined,
});
if (!built) {
  console.error("SIGN_SEALER isn't set: nothing to seal with.");
  process.exit(1);
}
const document = await PDFDocument.load(
  await buildTestPdf([{ lines: ["coss.com Sign: seal test", new Date().toISOString()] }]),
);
const bytes = await sealPdf(document, {
  sealer: built.sealer,
  tsa: built.tsa,
  name: "coss.com",
  reason: "Seal test",
  location: "coss.com",
  contactInfo: "https://coss.com",
  signedAt: new Date(),
});
writeFileSync(values.out, bytes);
const names = (der: Uint8Array) =>
  pkijs.Certificate.fromBER(new Uint8Array(der).buffer)
    .subject.typesAndValues.map((item) => item.value.valueBlock.value)
    .join(", ");
console.log(
  `Sealed by ${built.sealer.name}: ${built.sealer.certificateChain.map(names).join(" ← ")}`,
);
console.log(`Timestamp: ${built.tsa ? process.env.SIGN_TSA_URL : "none"}`);
console.log(`Wrote ${values.out} (${bytes.length} bytes).`);
