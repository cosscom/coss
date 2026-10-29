/**
 * Long-term validation data (PAdES B-LT): for every certificate a validator has to check (the
 * seal's chain and the timestamp's), an OCSP response or a CRL saying it wasn't revoked when the
 * document was sealed. Gathered at sealing and kept in the PDF's DSS (`dss.ts`), so the seal
 * still verifies once the certificates have expired or their CA no longer answers.
 */
import { createHash } from "node:crypto";
import { asn1js, engine, OID, parseCertificate, pkijs, toArrayBuffer } from "./crypto.ts";

export type ValidationData = {
  /** Every certificate involved: chains, issuers fetched on the way, OCSP responders. */
  certificates: Uint8Array[];
  /** DER OCSPResponses. */
  ocspResponses: Uint8Array[];
  /** DER CRLs. */
  crls: Uint8Array[];
};

const ID_AD_OCSP = "1.3.6.1.5.5.7.48.1";
const ID_AD_CA_ISSUERS = "1.3.6.1.5.5.7.48.2";
const ID_PKIX_OCSP_NOCHECK = "1.3.6.1.5.5.7.48.1.5";
const ID_KP_OCSP_SIGNING = "1.3.6.1.5.5.7.3.9";
const AUTHORITY_INFO_ACCESS = "1.3.6.1.5.5.7.1.1";
const CRL_DISTRIBUTION_POINTS = "2.5.29.31";
/** GeneralName's uniformResourceIdentifier. */
const URI_NAME = 6;
/** Certificates checked at most (a chain, a TSA's, responders), against a loop of fetched issuers. */
const MAX_CERTIFICATES = 16;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
/** How far a responder's clock may run ahead of ours. */
const CLOCK_SKEW_MS = 5 * 60_000;
/**
 * The oldest an answer without `nextUpdate` may be: such a responder always has newer
 * information, so an old one is a stale cache or a replay that could hide a revocation.
 */
const MAX_UNBOUNDED_AGE_MS = 2 * 86_400_000;

/** Issued not in the future, and not past its `nextUpdate` (or, without one, not too old). */
function isCurrent(thisUpdate: Date, nextUpdate: Date | undefined, now: Date): boolean {
  const at = now.getTime();
  if (thisUpdate.getTime() > at + CLOCK_SKEW_MS) return false;
  return nextUpdate
    ? nextUpdate.getTime() >= at
    : at - thisUpdate.getTime() <= MAX_UNBOUNDED_AGE_MS;
}

type Entry = { der: Uint8Array; certificate: pkijs.Certificate };

function entry(der: Uint8Array): Entry {
  return { der, certificate: parseCertificate(der) };
}

/** The certificates of a CMS signature and of the timestamp tokens it carries. */
export function certificatesOf(cms: Uint8Array): Uint8Array[] {
  const signedData = new pkijs.SignedData({
    schema: pkijs.ContentInfo.fromBER(toArrayBuffer(cms)).content,
  });
  const certificates: Uint8Array[] = (signedData.certificates ?? [])
    .filter((candidate) => candidate instanceof pkijs.Certificate)
    .map((certificate) => new Uint8Array(certificate.toSchema().toBER(false)));
  for (const signer of signedData.signerInfos) {
    for (const attribute of signer.unsignedAttrs?.attributes ?? []) {
      if (attribute.type !== OID.signatureTimeStampToken) continue;
      for (const value of attribute.values) {
        certificates.push(...certificatesOf(new Uint8Array(value.toBER(false))));
      }
    }
  }
  return certificates;
}

function commonName(certificate: pkijs.Certificate): string {
  const value = certificate.subject.typesAndValues.find((item) => item.type === "2.5.4.3")?.value;
  return value?.valueBlock?.value ?? "an unnamed certificate";
}

function extension(certificate: pkijs.Certificate, id: string): pkijs.Extension | undefined {
  return certificate.extensions?.find((item) => item.extnID === id);
}

/** The `http(s)` URIs of an Authority Information Access method. */
function accessUrls(certificate: pkijs.Certificate, method: string): string[] {
  const info = extension(certificate, AUTHORITY_INFO_ACCESS)?.parsedValue as
    | pkijs.InfoAccess
    | undefined;
  return (info?.accessDescriptions ?? [])
    .filter((description) => description.accessMethod === method)
    .map((description) => description.accessLocation)
    .filter((name) => name.type === URI_NAME)
    .map((name) => String(name.value))
    .filter(isHttpUrl);
}

/** The `http(s)` URIs of the CRL distribution points. */
function crlUrls(certificate: pkijs.Certificate): string[] {
  const points = extension(certificate, CRL_DISTRIBUTION_POINTS)?.parsedValue as
    | pkijs.CRLDistributionPoints
    | undefined;
  return (points?.distributionPoints ?? []).flatMap((point) =>
    (Array.isArray(point.distributionPoint) ? point.distributionPoint : [])
      .filter((name) => name.type === URI_NAME)
      .map((name) => String(name.value))
      .filter(isHttpUrl),
  );
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function issuedBy(certificate: pkijs.Certificate, issuer: pkijs.Certificate) {
  if (!certificate.issuer.isEqual(issuer.subject)) return false;
  try {
    return await certificate.verify(issuer);
  } catch {
    return false;
  }
}

async function download(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
): Promise<Uint8Array> {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_RESPONSE_BYTES) throw new Error(`${url} answered too much.`);
  return bytes;
}

/** An issuer from the certificate's caIssuers URL: one DER certificate, or a PKCS #7 bundle. */
async function fetchIssuer(
  certificate: pkijs.Certificate,
  fetchImpl: typeof fetch,
): Promise<Entry | null> {
  for (const url of accessUrls(certificate, ID_AD_CA_ISSUERS)) {
    let candidates: Uint8Array[];
    try {
      const bytes = await download(fetchImpl, url);
      try {
        candidates = [new Uint8Array(parseCertificate(bytes).toSchema().toBER(false))];
      } catch {
        candidates = certificatesOf(bytes);
      }
    } catch {
      continue;
    }
    for (const der of candidates) {
      const candidate = entry(der);
      if (await issuedBy(certificate, candidate.certificate)) return candidate;
    }
  }
  return null;
}

class RevokedError extends Error {}

function sameKey(a: pkijs.Certificate, b: pkijs.Certificate): boolean {
  return Buffer.from(a.subjectPublicKeyInfo.toSchema().toBER(false)).equals(
    Buffer.from(b.subjectPublicKeyInfo.toSchema().toBER(false)),
  );
}

/**
 * Whether `basic` is signed by `issuer` itself or by a responder it delegated to: a certificate
 * the issuer issued for OCSP signing, valid now (RFC 6960, 4.2.2.2). Checked here rather than by
 * pkijs's `verify`, which wants the signer embedded (a CA answering for itself often embeds
 * nothing) and a chain up to a root (we trust the issuer's word about its own certificates).
 */
async function signedByResponder(
  basic: pkijs.BasicOCSPResponse,
  issuer: Entry,
  now: Date,
): Promise<boolean> {
  const id = basic.tbsResponseData.responderID;
  for (const candidate of [issuer.certificate, ...(basic.certs ?? [])]) {
    const named =
      id instanceof pkijs.RelativeDistinguishedNames
        ? candidate.subject.isEqual(id)
        : id instanceof asn1js.OctetString &&
          createHash("sha1")
            .update(candidate.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView)
            .digest()
            .equals(Buffer.from(id.valueBlock.valueHexView));
    if (!named) continue;
    let signed = false;
    try {
      signed = await engine.verifyWithPublicKey(
        toArrayBuffer(basic.tbsResponseData.tbsView),
        basic.signature,
        candidate.subjectPublicKeyInfo,
        basic.signatureAlgorithm,
      );
    } catch {
      signed = false;
    }
    if (!signed) continue;
    if (
      candidate.subject.isEqual(issuer.certificate.subject) &&
      sameKey(candidate, issuer.certificate)
    ) {
      return true;
    }
    const purposes =
      (extension(candidate, OID.extKeyUsage)?.parsedValue as pkijs.ExtKeyUsage | undefined)
        ?.keyPurposes ?? [];
    if (
      purposes.includes(ID_KP_OCSP_SIGNING) &&
      candidate.notBefore.value <= now &&
      now <= candidate.notAfter.value &&
      (await issuedBy(candidate, issuer.certificate))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * A verified OCSP response saying `certificate` is good: signed by its issuer or a responder the
 * issuer delegated to, and current.
 */
async function ocspResponse(
  subject: Entry,
  issuer: Entry,
  url: string,
  opts: { fetch: typeof fetch; now: Date },
): Promise<{ der: Uint8Array; responders: Uint8Array[] }> {
  const request = new pkijs.OCSPRequest();
  // SHA-1 CertIDs: what every responder answers (RFC 5019).
  await request.createForCertificate(subject.certificate, {
    hashAlgorithm: "SHA-1",
    issuerCertificate: issuer.certificate,
  });
  const der = await download(opts.fetch, url, {
    method: "POST",
    headers: { "Content-Type": "application/ocsp-request" },
    body: new Uint8Array(request.toSchema(true).toBER(false)),
  });
  const response = pkijs.OCSPResponse.fromBER(toArrayBuffer(der));
  const status = response.responseStatus.valueBlock.valueDec;
  if (status !== 0 || !response.responseBytes) {
    throw new Error(`The OCSP responder refused (status ${status}).`);
  }
  const basic = pkijs.BasicOCSPResponse.fromBER(
    response.responseBytes.response.valueBlock.valueHexView.slice().buffer,
  );
  if (!(await signedByResponder(basic, issuer, opts.now))) {
    throw new Error("The OCSP response doesn't verify.");
  }
  const single = basic.tbsResponseData.responses.find((candidate) =>
    candidate.certID.serialNumber.isEqual(subject.certificate.serialNumber),
  );
  const { isForCertificate, status: certStatus } = await basic.getCertificateStatus(
    subject.certificate,
    issuer.certificate,
  );
  if (!single || !isForCertificate)
    throw new Error("The OCSP response is for another certificate.");
  if (certStatus === 1) throw new RevokedError(`"${commonName(subject.certificate)}" is revoked.`);
  if (certStatus !== 0) throw new Error("The OCSP responder doesn't know the certificate.");
  if (!isCurrent(single.thisUpdate, single.nextUpdate, opts.now)) {
    throw new Error("The OCSP response isn't current.");
  }
  return {
    der,
    responders: (basic.certs ?? []).map(
      (certificate) => new Uint8Array(certificate.toSchema().toBER(false)),
    ),
  };
}

/** A verified, current CRL from `issuer` that doesn't list `certificate`. */
async function crl(
  subject: Entry,
  issuer: Entry,
  url: string,
  opts: { fetch: typeof fetch; now: Date },
): Promise<Uint8Array> {
  const der = await download(opts.fetch, url);
  const list = pkijs.CertificateRevocationList.fromBER(toArrayBuffer(der));
  let verified = false;
  try {
    verified =
      list.issuer.isEqual(issuer.certificate.subject) &&
      (await list.verify({ issuerCertificate: issuer.certificate }));
  } catch {
    verified = false;
  }
  if (!verified) throw new Error("The CRL doesn't verify.");
  if (!isCurrent(list.thisUpdate.value, list.nextUpdate?.value, opts.now)) {
    throw new Error("The CRL isn't current.");
  }
  if (list.isCertificateRevoked(subject.certificate)) {
    throw new RevokedError(`"${commonName(subject.certificate)}" is revoked.`);
  }
  return der;
}

/**
 * Validation data for `certificates` (the seal's chain and the timestamp's): each certificate
 * that isn't a self-signed root or an OCSP responder marked `id-pkix-ocsp-nocheck` gets an OCSP
 * response (preferred: small) or else a CRL, verified against its issuer (from `certificates`, or
 * fetched from its caIssuers URL). A revoked certificate, or one with revocation URLs none of which
 * gives a good answer, fails the seal: it is retried, never published without its data.
 * Certificates without any revocation URLs (self-signed development keys) are skipped.
 */
export async function collectValidationData(
  certificates: readonly Uint8Array[],
  opts: { fetch?: typeof fetch; now?: Date } = {},
): Promise<ValidationData> {
  const fetchImpl = opts.fetch ?? fetch;
  const now = opts.now ?? new Date();
  const pool: Entry[] = [];
  const add = (der: Uint8Array): Entry => {
    const known = pool.find((item) => Buffer.from(item.der).equals(Buffer.from(der)));
    if (known) return known;
    const added = entry(der);
    pool.push(added);
    return added;
  };
  for (const der of certificates) add(der);

  const ocspResponses: Uint8Array[] = [];
  const crls: Uint8Array[] = [];
  for (let index = 0; index < pool.length; index++) {
    if (index >= MAX_CERTIFICATES) throw new Error("Too many certificates to validate.");
    const subject = pool[index] as Entry;
    const { certificate } = subject;
    if (await issuedBy(certificate, certificate)) continue;
    if (extension(certificate, ID_PKIX_OCSP_NOCHECK)) continue;
    const ocspUrls = accessUrls(certificate, ID_AD_OCSP);
    const crlList = crlUrls(certificate);
    if (ocspUrls.length === 0 && crlList.length === 0) continue;

    let issuer: Entry | null = null;
    for (const candidate of pool) {
      if (await issuedBy(certificate, candidate.certificate)) {
        issuer = candidate;
        break;
      }
    }
    if (!issuer) {
      const fetched = await fetchIssuer(certificate, fetchImpl);
      if (fetched) issuer = add(fetched.der);
    }
    if (!issuer && accessUrls(certificate, ID_AD_CA_ISSUERS).length > 0) {
      // Its caIssuers URL didn't answer: retried later, not sealed without its data.
      throw new Error(`The issuer of "${commonName(certificate)}" couldn't be fetched.`);
    }
    if (!issuer) {
      // A cross-signed root without a caIssuers URL (Sectigo's timestamping root, say): whoever
      // trusts it as an anchor needs nothing more, and nobody can check it against an issuer
      // we can't find.
      console.warn(`Sign seal: no issuer to check "${commonName(certificate)}" against, skipped.`);
      continue;
    }

    const failures: string[] = [];
    let done = false;
    for (const url of ocspUrls) {
      try {
        const answer = await ocspResponse(subject, issuer, url, { fetch: fetchImpl, now });
        ocspResponses.push(answer.der);
        for (const responder of answer.responders) add(responder);
        done = true;
        break;
      } catch (error) {
        if (error instanceof RevokedError) throw error;
        failures.push(`${url}: ${(error as Error).message}`);
      }
    }
    for (const url of done ? [] : crlList) {
      try {
        crls.push(await crl(subject, issuer, url, { fetch: fetchImpl, now }));
        done = true;
        break;
      } catch (error) {
        if (error instanceof RevokedError) throw error;
        failures.push(`${url}: ${(error as Error).message}`);
      }
    }
    if (!done) {
      throw new Error(
        `No revocation data for "${commonName(certificate)}" (${failures.join("; ")}).`,
      );
    }
  }
  return { certificates: pool.map((item) => item.der), ocspResponses, crls };
}

/** Whether `data` holds anything a validator couldn't work out alone. */
export function hasRevocationData(data: ValidationData): boolean {
  return data.ocspResponses.length > 0 || data.crls.length > 0;
}
