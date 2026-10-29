/**
 * A small CA for seal tests: a root, certificates it issues with OCSP, CRL and caIssuers URLs, and
 * a `fetch` that answers those URLs as the CA's servers would (OCSP signed by the root itself).
 */
import { webcrypto } from "node:crypto";
import { asn1js, OID, parseCertificate, pkijs, toArrayBuffer } from "../src/seal/crypto.ts";

export type Issued = { der: Uint8Array; certificate: pkijs.Certificate; privateKey: CryptoKey };

const ALGORITHM = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

let serial = 1;

function name(commonName: string): pkijs.RelativeDistinguishedNames {
  return new pkijs.RelativeDistinguishedNames({
    typesAndValues: [
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.3",
        value: new asn1js.Utf8String({ value: commonName }),
      }),
    ],
  });
}

function uri(url: string): pkijs.GeneralName {
  return new pkijs.GeneralName({ type: 6, value: url });
}

export async function issue(opts: {
  commonName: string;
  /** Default: self-signed. */
  issuer?: Issued;
  ca?: boolean;
  ocspUrl?: string;
  crlUrl?: string;
  caIssuersUrl?: string;
  extKeyUsage?: string[];
  ocspNoCheck?: boolean;
  /** Default: from a day ago to a year from now. */
  notAfter?: Date;
}): Promise<Issued> {
  const keys = (await webcrypto.subtle.generateKey(ALGORITHM, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const certificate = new pkijs.Certificate();
  certificate.version = 2;
  certificate.serialNumber = new asn1js.Integer({ value: 1000 + serial++ });
  certificate.subject = name(opts.commonName);
  certificate.issuer = opts.issuer ? opts.issuer.certificate.subject : name(opts.commonName);
  certificate.notBefore.value = new Date(Date.now() - 86_400_000);
  certificate.notAfter.value = opts.notAfter ?? new Date(Date.now() + 365 * 86_400_000);
  const extensions: pkijs.Extension[] = [
    new pkijs.Extension({
      extnID: "2.5.29.15",
      critical: true,
      // keyCertSign + cRLSign for a CA, digitalSignature + nonRepudiation otherwise.
      extnValue: new asn1js.BitString({
        valueHex: toArrayBuffer(new Uint8Array([opts.ca ? 0x06 : 0xc0])),
        unusedBits: opts.ca ? 1 : 6,
      }).toBER(false),
    }),
  ];
  if (opts.ca) {
    extensions.push(
      new pkijs.Extension({
        extnID: "2.5.29.19",
        critical: true,
        extnValue: new pkijs.BasicConstraints({ cA: true }).toSchema().toBER(false),
      }),
    );
  }
  const access = [
    ...(opts.ocspUrl ? [{ method: "1.3.6.1.5.5.7.48.1", url: opts.ocspUrl }] : []),
    ...(opts.caIssuersUrl ? [{ method: "1.3.6.1.5.5.7.48.2", url: opts.caIssuersUrl }] : []),
  ];
  if (access.length > 0) {
    extensions.push(
      new pkijs.Extension({
        extnID: "1.3.6.1.5.5.7.1.1",
        extnValue: new pkijs.InfoAccess({
          accessDescriptions: access.map(
            ({ method, url }) =>
              new pkijs.AccessDescription({ accessMethod: method, accessLocation: uri(url) }),
          ),
        })
          .toSchema()
          .toBER(false),
      }),
    );
  }
  if (opts.crlUrl) {
    extensions.push(
      new pkijs.Extension({
        extnID: "2.5.29.31",
        extnValue: new pkijs.CRLDistributionPoints({
          distributionPoints: [
            new pkijs.DistributionPoint({ distributionPoint: [uri(opts.crlUrl)] }),
          ],
        })
          .toSchema()
          .toBER(false),
      }),
    );
  }
  if (opts.extKeyUsage) {
    extensions.push(
      new pkijs.Extension({
        extnID: OID.extKeyUsage,
        extnValue: new pkijs.ExtKeyUsage({ keyPurposes: opts.extKeyUsage }).toSchema().toBER(false),
      }),
    );
  }
  if (opts.ocspNoCheck) {
    extensions.push(
      new pkijs.Extension({
        extnID: "1.3.6.1.5.5.7.48.1.5",
        extnValue: new asn1js.Null().toBER(false),
      }),
    );
  }
  certificate.extensions = extensions;
  await certificate.subjectPublicKeyInfo.importKey(keys.publicKey);
  await certificate.sign(opts.issuer?.privateKey ?? keys.privateKey, "SHA-256");
  const der = new Uint8Array(certificate.toSchema(true).toBER(false));
  return { der, certificate: parseCertificate(der), privateKey: keys.privateKey };
}

export const CA_URLS = {
  ocsp: "http://ocsp.ca.test/",
  crl: "http://crl.ca.test/root.crl",
  caIssuers: "http://ca.test/root.cer",
};

/**
 * The CA's servers: OCSP answers signed by `root` (or by `ocspSigner`), its CRL and its
 * certificate. `revoked` serials answer revoked; `down` URLs answer 503.
 */
export function caServers(opts: {
  root: Issued;
  revoked?: Set<number>;
  down?: Set<string>;
  ocspSigner?: Issued;
  /** Answers issued this long ago (default a minute), with or without `nextUpdate`. */
  issuedAgoMs?: number;
  omitNextUpdate?: boolean;
  /** CRL extensions (a delta indicator, an issuing distribution point). */
  crlExtensions?: pkijs.Extension[];
}) {
  const thisUpdate = () => new Date(Date.now() - (opts.issuedAgoMs ?? 60_000));
  const nextUpdate = () => (opts.omitNextUpdate ? undefined : new Date(Date.now() + 86_400_000));
  const calls: string[] = [];
  const fetchImpl = (async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    if (opts.down?.has(url)) return new Response("down", { status: 503 });
    if (url === CA_URLS.caIssuers) return new Response(new Uint8Array(opts.root.der));
    if (url === CA_URLS.crl) {
      const list = new pkijs.CertificateRevocationList({
        version: 1,
        issuer: opts.root.certificate.subject,
        thisUpdate: new pkijs.Time({ type: 0, value: thisUpdate() }),
      });
      const next = nextUpdate();
      if (next) list.nextUpdate = new pkijs.Time({ type: 0, value: next });
      if (opts.crlExtensions) {
        list.crlExtensions = new pkijs.Extensions({ extensions: opts.crlExtensions });
      }
      list.revokedCertificates = [...(opts.revoked ?? [])].map(
        (value) =>
          new pkijs.RevokedCertificate({
            userCertificate: new asn1js.Integer({ value }),
            revocationDate: new pkijs.Time({ type: 0, value: new Date(Date.now() - 3_600_000) }),
          }),
      );
      await list.sign(opts.root.privateKey, "SHA-256");
      return new Response(new Uint8Array(list.toSchema(true).toBER(false)));
    }
    if (url === CA_URLS.ocsp) {
      const body = new Uint8Array(await new Response(init?.body).arrayBuffer());
      const request = pkijs.OCSPRequest.fromBER(toArrayBuffer(body));
      const signer = opts.ocspSigner ?? opts.root;
      const basic = new pkijs.BasicOCSPResponse();
      basic.tbsResponseData.responderID = signer.certificate.subject;
      basic.tbsResponseData.producedAt = new Date();
      for (const item of request.tbsRequest.requestList) {
        const serialNumber = item.reqCert.serialNumber.valueBlock.valueDec;
        const revoked = opts.revoked?.has(serialNumber);
        const response = new pkijs.SingleResponse({ certID: item.reqCert });
        response.certStatus = revoked
          ? new asn1js.Constructed({
              idBlock: { tagClass: 3, tagNumber: 1 },
              value: [new asn1js.GeneralizedTime({ valueDate: new Date(Date.now() - 3_600_000) })],
            })
          : new asn1js.Primitive({ idBlock: { tagClass: 3, tagNumber: 0 } });
        response.thisUpdate = thisUpdate();
        const next = nextUpdate();
        if (next) response.nextUpdate = next;
        basic.tbsResponseData.responses.push(response);
      }
      if (opts.ocspSigner) basic.certs = [opts.ocspSigner.certificate];
      await basic.sign(signer.privateKey, "SHA-256");
      const response = new pkijs.OCSPResponse({
        responseStatus: new asn1js.Enumerated({ value: 0 }),
        responseBytes: new pkijs.ResponseBytes({
          responseType: "1.3.6.1.5.5.7.48.1.1",
          response: new asn1js.OctetString({ valueHex: basic.toSchema().toBER(false) }),
        }),
      });
      return new Response(new Uint8Array(response.toSchema().toBER(false)));
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

/** A sealing certificate issued by `root`, with the CA's URLs. */
export function sealingCertificate(root: Issued, commonName = "coss.com test seal") {
  return issue({
    commonName,
    issuer: root,
    ocspUrl: CA_URLS.ocsp,
    crlUrl: CA_URLS.crl,
    caIssuersUrl: CA_URLS.caIssuers,
  });
}

/** An issuing distribution point extension for a CRL. */
export function issuingDistributionPoint(
  point: Partial<pkijs.IssuingDistributionPointParameters> & { url?: string },
): pkijs.Extension {
  const { url, ...rest } = point;
  return new pkijs.Extension({
    extnID: "2.5.29.28",
    critical: true,
    extnValue: new pkijs.IssuingDistributionPoint({
      ...(url ? { distributionPoint: [uri(url)] } : {}),
      ...rest,
    })
      .toSchema()
      .toBER(false),
  });
}
