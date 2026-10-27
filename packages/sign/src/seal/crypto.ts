/**
 * pkijs set up on Node's Web Crypto, and the small ASN.1 helpers the seal needs. pkijs and asn1js
 * must be the same copies (instanceof checks), so everything imports them from here.
 */
import { webcrypto } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";

const engine = new pkijs.CryptoEngine({
  name: "node",
  crypto: webcrypto as unknown as Crypto,
});
pkijs.setEngine("node", engine);

export { asn1js, engine, pkijs };

export const OID = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  tstInfo: "1.2.840.113549.1.9.16.1.4",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingCertificateV2: "1.2.840.113549.1.9.16.2.47",
  signatureTimeStampToken: "1.2.840.113549.1.9.16.2.14",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsaEncryption: "1.2.840.113549.1.1.1",
  sha256WithRsa: "1.2.840.113549.1.1.11",
  ecPublicKey: "1.2.840.10045.2.1",
  ecdsaWithSha256: "1.2.840.10045.4.3.2",
} as const;

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await webcrypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
}

/** Parses a DER certificate. */
export function parseCertificate(der: Uint8Array): pkijs.Certificate {
  return pkijs.Certificate.fromBER(toArrayBuffer(der));
}

/** The DER certificates in a PEM bundle, in order. */
export function certificatesFromPem(pem: string): Uint8Array[] {
  const blocks = [
    ...pem
      .replaceAll("\\n", "\n")
      .matchAll(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/g),
  ];
  return blocks.map(
    (block) => new Uint8Array(Buffer.from((block[1] ?? "").replace(/\s+/g, ""), "base64")),
  );
}

/** The signature algorithm a certificate's key signs with (SHA-256 only). */
export function signatureAlgorithmFor(certificate: pkijs.Certificate): "rsa" | "ecdsa" {
  const algorithm = certificate.subjectPublicKeyInfo.algorithm.algorithmId;
  if (algorithm === OID.rsaEncryption) return "rsa";
  if (algorithm === OID.ecPublicKey) return "ecdsa";
  throw new Error(`Unsupported seal key algorithm ${algorithm}.`);
}
