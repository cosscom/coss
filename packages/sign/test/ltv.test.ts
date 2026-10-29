import { beforeAll, describe, expect, test } from "bun:test";
import { PDFArray, PDFDict, PDFDocument, PDFName, type PDFRawStream } from "pdf-lib";
import { pkijs, toArrayBuffer } from "../src/seal/crypto.ts";
import { collectValidationData } from "../src/seal/ltv.ts";
import { readPdfSeal, sealPdf } from "../src/seal/pdf-signature.ts";
import { LocalSealer } from "../src/seal/sealer.ts";
import { LocalTsa } from "../src/seal/tsa.ts";
import { buildTestPdf } from "../src/testing.ts";
import { CA_URLS, caServers, type Issued, issue, sealingCertificate } from "./pki.ts";

let root: Issued;
let leaf: Issued;

beforeAll(async () => {
  root = await issue({ commonName: "coss.com Test Root", ca: true });
  leaf = await sealingCertificate(root);
});

function serialOf(issued: Issued): number {
  return issued.certificate.serialNumber.valueBlock.valueDec;
}

async function verifyCms(cms: Uint8Array, signedBytes: Uint8Array): Promise<boolean> {
  const signedData = new pkijs.SignedData({
    schema: pkijs.ContentInfo.fromBER(toArrayBuffer(cms)).content,
  });
  try {
    return await signedData.verify({
      signer: 0,
      data: toArrayBuffer(signedBytes),
      checkChain: false,
    });
  } catch {
    return false;
  }
}

/** The DSS's lists, read back with pdf-lib: each entry's stream bytes. */
async function readDss(
  bytes: Uint8Array,
): Promise<Record<"Certs" | "OCSPs" | "CRLs", Uint8Array[]>> {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const dss = document.catalog.lookup(PDFName.of("DSS"), PDFDict);
  const read = (key: string) => {
    const list = dss.lookupMaybe(PDFName.of(key), PDFArray);
    return (list?.asArray() ?? []).map((ref) =>
      (document.context.lookup(ref) as PDFRawStream).getContents(),
    );
  };
  return { Certs: read("Certs"), OCSPs: read("OCSPs"), CRLs: read("CRLs") };
}

describe("validation data", () => {
  test("an OCSP response for the seal's certificate, its issuer fetched from caIssuers", async () => {
    const servers = caServers({ root });
    const data = await collectValidationData([leaf.der], { fetch: servers.fetch });
    expect(servers.calls).toEqual([CA_URLS.caIssuers, CA_URLS.ocsp]);
    expect(data.ocspResponses).toHaveLength(1);
    expect(data.crls).toHaveLength(0);
    expect(data.certificates.map((der) => Buffer.from(der).toString("hex"))).toEqual(
      [leaf.der, root.der].map((der) => Buffer.from(der).toString("hex")),
    );
  });

  test("falls back to the CRL when the OCSP responder is down", async () => {
    const servers = caServers({ root, down: new Set([CA_URLS.ocsp]) });
    const data = await collectValidationData([leaf.der, root.der], { fetch: servers.fetch });
    expect(servers.calls).toEqual([CA_URLS.ocsp, CA_URLS.crl]);
    expect(data.ocspResponses).toHaveLength(0);
    expect(data.crls).toHaveLength(1);
  });

  test("a revoked certificate fails the seal, by OCSP or by CRL", async () => {
    const revoked = new Set([serialOf(leaf)]);
    await expect(
      collectValidationData([leaf.der, root.der], { fetch: caServers({ root, revoked }).fetch }),
    ).rejects.toThrow("is revoked");
    await expect(
      collectValidationData([leaf.der, root.der], {
        fetch: caServers({ root, revoked, down: new Set([CA_URLS.ocsp]) }).fetch,
      }),
    ).rejects.toThrow("is revoked");
  });

  test("an OCSP answer from someone the CA didn't delegate to isn't used", async () => {
    const stranger = await issue({ commonName: "Not the CA" });
    const servers = caServers({ root, ocspSigner: stranger, down: new Set([CA_URLS.crl]) });
    await expect(
      collectValidationData([leaf.der, root.der], { fetch: servers.fetch }),
    ).rejects.toThrow(/No revocation data for "coss.com test seal".*doesn't verify/);
  });

  test("a delegated OCSP responder's answer is used, and its own certificate kept", async () => {
    const responder = await issue({
      commonName: "coss.com Test OCSP",
      issuer: root,
      extKeyUsage: ["1.3.6.1.5.5.7.3.9"],
      ocspNoCheck: true,
    });
    const servers = caServers({ root, ocspSigner: responder });
    const data = await collectValidationData([leaf.der, root.der], { fetch: servers.fetch });
    expect(data.ocspResponses).toHaveLength(1);
    expect(data.certificates).toHaveLength(3);
    // The responder is `ocsp-nocheck`: nothing asked about it.
    expect(servers.calls).toEqual([CA_URLS.ocsp]);
  });

  test("an issuer that can't be fetched fails; one nobody could fetch is skipped", async () => {
    const down = caServers({ root, down: new Set([CA_URLS.caIssuers]) });
    await expect(collectValidationData([leaf.der], { fetch: down.fetch })).rejects.toThrow(
      "couldn't be fetched",
    );
    // A cross-signed certificate naming no caIssuers URL (whose issuer isn't here).
    const crossSigned = await issue({
      commonName: "Cross-signed root",
      issuer: root,
      ocspUrl: CA_URLS.ocsp,
    });
    const servers = caServers({ root });
    const data = await collectValidationData([crossSigned.der], { fetch: servers.fetch });
    expect(servers.calls).toEqual([]);
    expect(data.ocspResponses).toHaveLength(0);
  });

  test("no revocation URLs, nothing fetched (self-signed development keys)", async () => {
    const sealer = await LocalSealer.create();
    const servers = caServers({ root });
    const data = await collectValidationData(sealer.certificateChain, { fetch: servers.fetch });
    expect(servers.calls).toEqual([]);
    expect(data.ocspResponses).toHaveLength(0);
  });
});

describe("sealing with validation data (PAdES B-LT)", () => {
  test("the DSS follows the seal, which still covers what it signed", async () => {
    const servers = caServers({ root });
    const document = await PDFDocument.load(await buildTestPdf());
    const tsa = await LocalTsa.create();
    const bytes = await sealPdf(document, {
      sealer: LocalSealer.fromKey([leaf.der], leaf.privateKey),
      tsa,
      name: "coss.com",
      reason: "Test",
      signedAt: new Date(),
      fetch: servers.fetch,
    });
    const seal = readPdfSeal(bytes);
    expect(await verifyCms(seal.cms, seal.signedBytes)).toBe(true);
    // An incremental update after the signed bytes: the DSS, the catalog again, a new xref.
    const signedEnd = seal.byteRange[2] + seal.byteRange[3];
    expect(signedEnd).toBeLessThan(bytes.length);
    const update = Buffer.from(bytes.subarray(signedEnd)).toString("latin1");
    expect(update).toContain("/DSS");
    expect(update).toMatch(/\/Prev \d+/);
    expect(update.trimEnd().endsWith("%%EOF")).toBe(true);

    const dss = await readDss(bytes);
    expect(dss.OCSPs).toHaveLength(1);
    expect(dss.CRLs).toHaveLength(0);
    // The seal's chain with the fetched root, and the (self-signed) TSA's certificate.
    const hex = (der: Uint8Array) => Buffer.from(der).toString("hex");
    expect(dss.Certs.map(hex).sort()).toEqual(
      [leaf.der, root.der, tsa.certificate].map(hex).sort(),
    );
    const ocsp = pkijs.OCSPResponse.fromBER(toArrayBuffer(dss.OCSPs[0] ?? new Uint8Array()));
    expect(ocsp.responseStatus.valueBlock.valueDec).toBe(0);

    // Still a document pdf-lib reads as a whole, pages and seal intact.
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
    expect(reloaded.catalog.lookup(PDFName.of("AcroForm"), PDFDict)).toBeDefined();
  });

  test("a seal whose validation data can't be found fails (and is retried)", async () => {
    const servers = caServers({ root, down: new Set([CA_URLS.ocsp, CA_URLS.crl]) });
    const document = await PDFDocument.load(await buildTestPdf());
    await expect(
      sealPdf(document, {
        sealer: LocalSealer.fromKey([leaf.der, root.der], leaf.privateKey),
        name: "coss.com",
        reason: "Test",
        signedAt: new Date(),
        fetch: servers.fetch,
      }),
    ).rejects.toThrow("No revocation data");
  });
});
