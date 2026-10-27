/**
 * What seals completed documents: a key that signs and the certificate chain that names it.
 * Production uses an AWS KMS key with a document-signing certificate from a CA on Adobe's trust
 * list (`KmsSealer`); development and tests a self-signed key made at start (`LocalSealer`).
 */
import { webcrypto } from "node:crypto";
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";
import {
  asn1js,
  OID,
  parseCertificate,
  pkijs,
  sha256,
  signatureAlgorithmFor,
  toArrayBuffer,
} from "./crypto.ts";

export interface Sealer {
  readonly name: string;
  /** DER certificates: the sealing certificate first, then its issuers (no root needed). */
  readonly certificateChain: readonly Uint8Array[];
  /** Signs `data` (hashing it with SHA-256 first): a PKCS #1 v1.5 or DER ECDSA signature. */
  sign(data: Uint8Array): Promise<Uint8Array>;
}

/** A self-signed certificate for `name`, made with a fresh key (development, tests). */
export async function selfSignedCertificate(
  name: string,
  opts: { timeStamping?: boolean; validDays?: number } = {},
): Promise<{ certificate: Uint8Array; privateKey: CryptoKey }> {
  const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  };
  const keys = (await webcrypto.subtle.generateKey(algorithm, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const certificate = new pkijs.Certificate();
  certificate.version = 2;
  certificate.serialNumber = new asn1js.Integer({
    valueHex: toArrayBuffer(
      webcrypto.getRandomValues(new Uint8Array(8)).map((byte, index) =>
        // A positive serial number.
        index === 0 ? byte & 0x7f : byte,
      ),
    ),
  });
  const commonName = new pkijs.AttributeTypeAndValue({
    type: "2.5.4.3",
    value: new asn1js.Utf8String({ value: name }),
  });
  certificate.issuer.typesAndValues.push(commonName);
  certificate.subject.typesAndValues.push(commonName);
  const now = new Date();
  certificate.notBefore.value = new Date(now.getTime() - 60_000);
  certificate.notAfter.value = new Date(now.getTime() + (opts.validDays ?? 3650) * 86_400_000);
  const keyUsage = new asn1js.BitString({
    // digitalSignature, nonRepudiation (contentCommitment).
    valueHex: toArrayBuffer(new Uint8Array([0xc0])),
    unusedBits: 6,
  });
  certificate.extensions = [
    new pkijs.Extension({
      extnID: "2.5.29.15",
      critical: true,
      extnValue: keyUsage.toBER(false),
    }),
    ...(opts.timeStamping
      ? [
          new pkijs.Extension({
            extnID: OID.extKeyUsage,
            critical: true,
            extnValue: new pkijs.ExtKeyUsage({
              keyPurposes: [OID.timeStamping],
            })
              .toSchema()
              .toBER(false),
          }),
        ]
      : []),
  ];
  await certificate.subjectPublicKeyInfo.importKey(keys.publicKey);
  await certificate.sign(keys.privateKey, "SHA-256");
  return {
    certificate: new Uint8Array(certificate.toSchema(true).toBER(false)),
    privateKey: keys.privateKey,
  };
}

/** Seals with a self-signed key made for this process: documents verify, but no viewer trusts it. */
export class LocalSealer implements Sealer {
  readonly name = "local";

  private constructor(
    readonly certificateChain: readonly Uint8Array[],
    private readonly privateKey: CryptoKey,
  ) {}

  static async create(name = "coss.com Sign (development)"): Promise<LocalSealer> {
    const { certificate, privateKey } = await selfSignedCertificate(name);
    return new LocalSealer([certificate], privateKey);
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(
      await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", this.privateKey, toArrayBuffer(data)),
    );
  }
}

/** Signs a SHA-256 digest with a KMS key (`MessageType: DIGEST`). */
export type KmsSign = (input: {
  keyId: string;
  digest: Uint8Array;
  algorithm: "RSASSA_PKCS1_V1_5_SHA_256" | "ECDSA_SHA_256";
}) => Promise<Uint8Array>;

/** The default `KmsSign`: the AWS SDK with the default credential chain. */
export function awsKmsSign(client: KMSClient = new KMSClient({})): KmsSign {
  return async ({ keyId, digest, algorithm }) => {
    const result = await client.send(
      new SignCommand({
        KeyId: keyId,
        Message: digest,
        MessageType: "DIGEST",
        SigningAlgorithm: algorithm,
      }),
    );
    if (!result.Signature) throw new Error("KMS returned no signature.");
    return result.Signature;
  };
}

/** Seals with a KMS key whose certificate (and its issuers) is `certificateChain`. */
export class KmsSealer implements Sealer {
  readonly name = "kms";
  private readonly algorithm: "RSASSA_PKCS1_V1_5_SHA_256" | "ECDSA_SHA_256";

  constructor(
    private readonly opts: {
      keyId: string;
      certificateChain: readonly Uint8Array[];
      sign?: KmsSign;
    },
  ) {
    const [leaf] = opts.certificateChain;
    if (!leaf) throw new Error("The seal's certificate chain is empty.");
    this.algorithm =
      signatureAlgorithmFor(parseCertificate(leaf)) === "rsa"
        ? "RSASSA_PKCS1_V1_5_SHA_256"
        : "ECDSA_SHA_256";
  }

  get certificateChain(): readonly Uint8Array[] {
    return this.opts.certificateChain;
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const sign = this.opts.sign ?? awsKmsSign();
    return sign({ keyId: this.opts.keyId, digest: await sha256(data), algorithm: this.algorithm });
  }
}
