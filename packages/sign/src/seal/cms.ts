/**
 * The seal's CMS: a detached CAdES signature (PAdES baseline B-B, or B-T with a timestamp) over
 * the PDF's byte ranges. Signed attributes: content type, message digest and the signing
 * certificate's hash (`signingCertificateV2`, which PAdES requires). No signing time attribute:
 * PAdES puts the time in the signature dictionary (`/M`) and the timestamp.
 */
import {
  asn1js,
  OID,
  parseCertificate,
  pkijs,
  sha256,
  signatureAlgorithmFor,
  toArrayBuffer,
} from "./crypto.ts";
import type { Sealer } from "./sealer.ts";
import type { TimestampAuthority } from "./tsa.ts";

/** `signingCertificateV2` naming `certificate` (ESSCertIDv2 with SHA-256, the default). */
export async function signingCertificateV2(certificate: Uint8Array): Promise<pkijs.Attribute> {
  const parsed = parseCertificate(certificate);
  const issuerSerial = new pkijs.IssuerSerial({
    issuer: new pkijs.GeneralNames({
      names: [new pkijs.GeneralName({ type: 4, value: parsed.issuer })],
    }),
    serialNumber: parsed.serialNumber,
  });
  const essCertId = new asn1js.Sequence({
    value: [
      new asn1js.OctetString({ valueHex: toArrayBuffer(await sha256(certificate)) }),
      issuerSerial.toSchema(),
    ],
  });
  return new pkijs.Attribute({
    type: OID.signingCertificateV2,
    values: [new asn1js.Sequence({ value: [new asn1js.Sequence({ value: [essCertId] })] })],
  });
}

/** The signed attributes, and their DER as a SET (what is actually signed). */
export async function signedAttributes(input: {
  contentType: string;
  digest: Uint8Array;
  certificate: Uint8Array;
}): Promise<{ attributes: pkijs.SignedAndUnsignedAttributes; der: Uint8Array }> {
  const attributes = new pkijs.SignedAndUnsignedAttributes({
    type: 0,
    attributes: [
      new pkijs.Attribute({
        type: OID.contentType,
        values: [new asn1js.ObjectIdentifier({ value: input.contentType })],
      }),
      new pkijs.Attribute({
        type: OID.messageDigest,
        values: [new asn1js.OctetString({ valueHex: toArrayBuffer(input.digest) })],
      }),
      await signingCertificateV2(input.certificate),
    ],
  });
  const der = new Uint8Array(attributes.toSchema().toBER(false));
  // Encoded as `[0] IMPLICIT` inside SignerInfo, but signed as a SET OF (RFC 5652, 5.4).
  der[0] = 0x31;
  return { attributes, der };
}

function signatureAlgorithmId(certificate: Uint8Array): pkijs.AlgorithmIdentifier {
  return signatureAlgorithmFor(parseCertificate(certificate)) === "rsa"
    ? new pkijs.AlgorithmIdentifier({
        algorithmId: OID.sha256WithRsa,
        algorithmParams: new asn1js.Null(),
      })
    : new pkijs.AlgorithmIdentifier({ algorithmId: OID.ecdsaWithSha256 });
}

/**
 * A detached CMS SignedData over `contentDigest` (the SHA-256 of the signed bytes), signed by the
 * sealer and, with a TSA, timestamped (`signatureTimeStampToken` over the signature value).
 */
export async function cadesSignature(input: {
  contentDigest: Uint8Array;
  sealer: Sealer;
  tsa?: TimestampAuthority | null;
  /** Certificates to embed besides the sealer's chain (e.g. the TSA's). */
  extraCertificates?: readonly Uint8Array[];
}): Promise<Uint8Array> {
  const [leaf] = input.sealer.certificateChain;
  if (!leaf) throw new Error("The sealer has no certificate.");
  const certificate = parseCertificate(leaf);
  const { attributes, der } = await signedAttributes({
    contentType: OID.data,
    digest: input.contentDigest,
    certificate: leaf,
  });
  const signature = await input.sealer.sign(der);
  const signerInfo = new pkijs.SignerInfo({
    version: 1,
    sid: new pkijs.IssuerAndSerialNumber({
      issuer: certificate.issuer,
      serialNumber: certificate.serialNumber,
    }),
    digestAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256 }),
    signedAttrs: attributes,
    signatureAlgorithm: signatureAlgorithmId(leaf),
    signature: new asn1js.OctetString({ valueHex: toArrayBuffer(signature) }),
  });
  if (input.tsa) {
    const token = await input.tsa.timestamp(await sha256(signature));
    signerInfo.unsignedAttrs = new pkijs.SignedAndUnsignedAttributes({
      type: 1,
      attributes: [
        new pkijs.Attribute({
          type: OID.signatureTimeStampToken,
          values: [asn1js.fromBER(toArrayBuffer(token)).result],
        }),
      ],
    });
  }
  const signedData = new pkijs.SignedData({
    version: 1,
    digestAlgorithms: [new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256 })],
    encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: OID.data }),
    certificates: [...input.sealer.certificateChain, ...(input.extraCertificates ?? [])].map(
      (der) => parseCertificate(der),
    ),
    signerInfos: [signerInfo],
  });
  const contentInfo = new pkijs.ContentInfo({
    contentType: OID.signedData,
    content: signedData.toSchema(true),
  });
  return new Uint8Array(contentInfo.toSchema().toBER(false));
}
