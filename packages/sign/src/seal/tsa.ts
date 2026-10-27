/**
 * RFC 3161 timestamps: a trusted third party's signed statement that the seal's signature existed
 * at a time (PAdES B-T). `HttpTsa` asks a TSA over HTTP; `LocalTsa` signs its own (tests, local
 * development).
 */
import { webcrypto } from "node:crypto";
import { signedAttributes } from "./cms.ts";
import { asn1js, OID, parseCertificate, pkijs, sha256, toArrayBuffer } from "./crypto.ts";
import { selfSignedCertificate } from "./sealer.ts";

export interface TimestampAuthority {
  /** A TimeStampToken (CMS ContentInfo, DER) over `digest`, a SHA-256 hash. */
  timestamp(digest: Uint8Array): Promise<Uint8Array>;
}

function messageImprint(digest: Uint8Array): pkijs.MessageImprint {
  return new pkijs.MessageImprint({
    hashAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256 }),
    hashedMessage: new asn1js.OctetString({ valueHex: toArrayBuffer(digest) }),
  });
}

/** The TSTInfo of a token, checked to be over `digest` (and to carry `nonce`, when given). */
export function readTimestampToken(
  token: Uint8Array,
  digest: Uint8Array,
  nonce?: Uint8Array,
): pkijs.TSTInfo {
  const contentInfo = pkijs.ContentInfo.fromBER(toArrayBuffer(token));
  const signedData = new pkijs.SignedData({ schema: contentInfo.content });
  const eContent = signedData.encapContentInfo.eContent;
  if (signedData.encapContentInfo.eContentType !== OID.tstInfo || !eContent) {
    throw new Error("The TSA's answer is not a timestamp token.");
  }
  const tstInfo = pkijs.TSTInfo.fromBER(eContent.getValue());
  const hashed = new Uint8Array(tstInfo.messageImprint.hashedMessage.getValue());
  if (Buffer.compare(Buffer.from(hashed), Buffer.from(digest)) !== 0) {
    throw new Error("The TSA timestamped something else.");
  }
  if (nonce) {
    const got = tstInfo.nonce ? new Uint8Array(tstInfo.nonce.valueBlock.valueHexView) : null;
    if (!got || !sameInteger(got, nonce)) {
      throw new Error("The TSA's answer has the wrong nonce.");
    }
  }
  return tstInfo;
}

/** Two big-endian integers' bytes, equal as numbers (a DER encoding drops leading zero bytes). */
function sameInteger(a: Uint8Array, b: Uint8Array): boolean {
  const strip = (bytes: Uint8Array) => {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    return Buffer.from(bytes.subarray(start));
  };
  return strip(a).equals(strip(b));
}

/**
 * Checks the token's signature with the certificate it carries, and that the certificate is for
 * time-stamping: a corrupted or altered answer is refused (and the seal retried) instead of being
 * published for good. Whether that certificate is one to trust is the validator's question, as
 * for the seal's own chain.
 */
export async function verifyTimestampToken(token: Uint8Array): Promise<void> {
  const contentInfo = pkijs.ContentInfo.fromBER(toArrayBuffer(token));
  const signedData = new pkijs.SignedData({ schema: contentInfo.content });
  // Verified as plain signed content: pkijs's own timestamp path wants the timestamped data itself
  // (only its digest is here; `readTimestampToken` checks the TSTInfo), and asn1js leaves the raw
  // bytes of a parsed octet string empty, so it gets a fresh one with the same bytes.
  const eContent = signedData.encapContentInfo.eContent;
  if (!eContent) throw new Error("The TSA's answer is not a timestamp token.");
  signedData.encapContentInfo.eContentType = OID.data;
  signedData.encapContentInfo.eContent = new asn1js.OctetString({
    valueHex: eContent.getValue(),
  });
  let valid = false;
  try {
    valid =
      (await signedData.verify({ signer: 0, checkChain: false, extendedMode: true }))
        .signatureVerified === true;
  } catch {
    valid = false;
  }
  if (!valid) throw new Error("The TSA's token doesn't verify.");
  const signer = signedData.signerInfos[0];
  const certificate = signedData.certificates?.find(
    (candidate): candidate is pkijs.Certificate =>
      candidate instanceof pkijs.Certificate &&
      signer?.sid instanceof pkijs.IssuerAndSerialNumber &&
      candidate.issuer.isEqual(signer.sid.issuer) &&
      candidate.serialNumber.isEqual(signer.sid.serialNumber),
  );
  const usage = certificate?.extensions?.find((extension) => extension.extnID === OID.extKeyUsage);
  const purposes = (usage?.parsedValue as pkijs.ExtKeyUsage | undefined)?.keyPurposes ?? [];
  if (!purposes.includes(OID.timeStamping)) {
    throw new Error("The TSA's certificate isn't for time-stamping.");
  }
}

/** A TSA over HTTP (`application/timestamp-query`). */
export class HttpTsa implements TimestampAuthority {
  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async timestamp(digest: Uint8Array): Promise<Uint8Array> {
    // A positive 8-byte nonce.
    const nonce = webcrypto.getRandomValues(new Uint8Array(8));
    nonce[0] = (nonce[0] ?? 0) & 0x7f;
    const request = new pkijs.TimeStampReq({
      version: 1,
      messageImprint: messageImprint(digest),
      nonce: new asn1js.Integer({ valueHex: toArrayBuffer(nonce) }),
      certReq: true,
    });
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body: new Uint8Array(request.toSchema().toBER(false)),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`The TSA answered ${response.status}.`);
    const answer = pkijs.TimeStampResp.fromBER(await response.arrayBuffer());
    const status = answer.status.status;
    if ((status !== 0 && status !== 1) || !answer.timeStampToken) {
      throw new Error(`The TSA refused the request (status ${status}).`);
    }
    const token = new Uint8Array(answer.timeStampToken.toSchema().toBER(false));
    readTimestampToken(token, digest, nonce);
    await verifyTimestampToken(token);
    return token;
  }
}

/** A TSA of its own, with a self-signed time-stamping certificate. */
export class LocalTsa implements TimestampAuthority {
  private serial = 1;

  private constructor(
    readonly certificate: Uint8Array,
    private readonly privateKey: CryptoKey,
    private readonly now: () => Date,
  ) {}

  static async create(opts: { now?: () => Date } = {}): Promise<LocalTsa> {
    const { certificate, privateKey } = await selfSignedCertificate("coss.com Sign test TSA", {
      timeStamping: true,
    });
    return new LocalTsa(certificate, privateKey, opts.now ?? (() => new Date()));
  }

  /** Answers RFC 3161 requests as a TSA over HTTP would: `new HttpTsa(url, tsa.fetch)`. */
  readonly fetch = (async (_input: unknown, init?: RequestInit): Promise<Response> => {
    const body = new Uint8Array(await new Response(init?.body).arrayBuffer());
    const request = pkijs.TimeStampReq.fromBER(toArrayBuffer(body));
    const token = await this.timestamp(
      new Uint8Array(request.messageImprint.hashedMessage.getValue()),
      request.nonce,
    );
    const answer = new pkijs.TimeStampResp({
      status: new pkijs.PKIStatusInfo({ status: 0 }),
      timeStampToken: pkijs.ContentInfo.fromBER(toArrayBuffer(token)),
    });
    return new Response(new Uint8Array(answer.toSchema().toBER(false)), {
      headers: { "Content-Type": "application/timestamp-reply" },
    });
  }) as typeof fetch;

  async timestamp(digest: Uint8Array, nonce?: asn1js.Integer): Promise<Uint8Array> {
    const tstInfo = new pkijs.TSTInfo({
      version: 1,
      policy: "1.3.6.1.4.1.65535.1",
      messageImprint: messageImprint(digest),
      serialNumber: new asn1js.Integer({ value: this.serial++ }),
      genTime: this.now(),
      ...(nonce ? { nonce } : {}),
    });
    const content = new Uint8Array(tstInfo.toSchema().toBER(false));
    const certificate = parseCertificate(this.certificate);
    const { attributes, der } = await signedAttributes({
      contentType: OID.tstInfo,
      digest: await sha256(content),
      certificate: this.certificate,
    });
    const signature = new Uint8Array(
      await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", this.privateKey, toArrayBuffer(der)),
    );
    const signedData = new pkijs.SignedData({
      version: 3,
      digestAlgorithms: [new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256 })],
      encapContentInfo: new pkijs.EncapsulatedContentInfo({
        eContentType: OID.tstInfo,
        eContent: new asn1js.OctetString({ valueHex: toArrayBuffer(content) }),
      }),
      certificates: [certificate],
      signerInfos: [
        new pkijs.SignerInfo({
          version: 1,
          sid: new pkijs.IssuerAndSerialNumber({
            issuer: certificate.issuer,
            serialNumber: certificate.serialNumber,
          }),
          digestAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256 }),
          signedAttrs: attributes,
          signatureAlgorithm: new pkijs.AlgorithmIdentifier({
            algorithmId: OID.sha256WithRsa,
            algorithmParams: new asn1js.Null(),
          }),
          signature: new asn1js.OctetString({ valueHex: toArrayBuffer(signature) }),
        }),
      ],
    });
    return new Uint8Array(
      new pkijs.ContentInfo({ contentType: OID.signedData, content: signedData.toSchema(true) })
        .toSchema()
        .toBER(false),
    );
  }
}
