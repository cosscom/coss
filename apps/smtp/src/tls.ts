/**
 * The relay's TLS certificate. SMTP clients upgrade with STARTTLS (587), which no load balancer
 * can terminate, so the process holds the certificate itself: in production an exportable ACM
 * certificate (ACM renews it; the relay exports it again every 12 hours), elsewhere files or a
 * self-signed certificate.
 */
import { spawnSync } from "node:child_process";
import { createPrivateKey } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACMClient, ExportCertificateCommand } from "@aws-sdk/client-acm";

export type TlsMaterial = { key: string; cert: string };

/** How often a running relay exports its certificate again (ACM renews ahead of expiry). */
export const TLS_RELOAD_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** The certificate, its chain and the decrypted key (ACM only exports passphrase-encrypted keys). */
export async function exportAcmCertificate(options: {
  arn: string;
  passphrase: string;
  client?: Pick<ACMClient, "send">;
}): Promise<TlsMaterial> {
  const client = options.client ?? new ACMClient({});
  const output = await client.send(
    new ExportCertificateCommand({
      CertificateArn: options.arn,
      Passphrase: new TextEncoder().encode(options.passphrase),
    }),
  );
  if (!output.Certificate || !output.PrivateKey) {
    throw new Error(`ACM returned no certificate or key for ${options.arn}.`);
  }
  const key = createPrivateKey({
    key: output.PrivateKey,
    format: "pem",
    passphrase: options.passphrase,
  })
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  const cert = [output.Certificate, output.CertificateChain]
    .filter(Boolean)
    .map((pem) => pem?.trim())
    .join("\n");
  return { key, cert: `${cert}\n` };
}

export function readTlsFiles(certFile: string, keyFile: string): TlsMaterial {
  return { cert: readFileSync(certFile, "utf8"), key: readFileSync(keyFile, "utf8") };
}

/**
 * A self-signed certificate for `hostname` (development and tests only: clients must skip
 * verification). Made with the `openssl` CLI and kept in the temp directory between runs.
 */
export function selfSignedCertificate(hostname = "localhost"): TlsMaterial {
  const dir = join(tmpdir(), "coss-smtp-tls");
  const certFile = join(dir, `${hostname}.crt`);
  const keyFile = join(dir, `${hostname}.key`);
  if (!existsSync(certFile) || !existsSync(keyFile)) {
    mkdirSync(dir, { recursive: true });
    const result = spawnSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "ec",
        "-pkeyopt",
        "ec_paramgen_curve:prime256v1",
        "-nodes",
        "-days",
        "3650",
        "-subj",
        `/CN=${hostname}`,
        "-addext",
        `subjectAltName=DNS:${hostname},IP:127.0.0.1`,
        "-keyout",
        keyFile,
        "-out",
        certFile,
      ],
      { stdio: "pipe" },
    );
    if (result.status !== 0) {
      throw new Error(
        `Could not create a self-signed certificate with openssl: ${result.stderr?.toString() || result.error}`,
      );
    }
  }
  return readTlsFiles(certFile, keyFile);
}
