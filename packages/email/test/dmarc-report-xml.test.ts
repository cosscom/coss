import { describe, expect, test } from "bun:test";
import { deflateRawSync, gzipSync } from "node:zlib";
import {
  DmarcReportError,
  MAX_DMARC_REPORT_BYTES,
  MAX_DMARC_REPORT_RECORDS,
  parseDmarcAggregateReport,
  parseXml,
  unpackDmarcReport,
} from "../src/dmarc-report-xml.ts";
import { dmarcReportXml, type SampleDmarcReport } from "../src/dmarc-sample.ts";

const encoder = new TextEncoder();

const REPORT: SampleDmarcReport = {
  domain: "acme.test",
  reporterOrg: "google.com",
  reporterEmail: "noreply-dmarc-support@google.com",
  reportId: "13845021974128475",
  begin: new Date("2026-10-09T00:00:00Z"),
  end: new Date("2026-10-09T23:59:59Z"),
  policy: { p: "none", pct: 100 },
  records: [
    {
      sourceIp: "54.240.8.12",
      count: 1200,
      dkim: "pass",
      spf: "pass",
      envelopeFrom: "send.acme.test",
      dkimResults: [{ domain: "acme.test", selector: "tok1", result: "pass" }],
    },
    {
      sourceIp: "2001:DB8::1",
      count: 4,
      disposition: "none",
      dkim: "fail",
      spf: "fail",
    },
  ],
};

/** A zip archive with the given entries, deflated (method 8) unless `stored`. */
function zip(entries: { name: string; content: Uint8Array; stored?: boolean }[]): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.stored ? Buffer.from(entry.content) : deflateRawSync(entry.content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(entry.stored ? 0 : 8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.content.byteLength, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(entry.stored ? 0 : 8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(entry.content.byteLength, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}

describe("unpackDmarcReport", () => {
  const xml = dmarcReportXml(REPORT);

  test("reads gzip, zip (deflated or stored) and plain XML", () => {
    expect(unpackDmarcReport(gzipSync(xml))).toBe(xml);
    expect(
      unpackDmarcReport(
        zip([
          { name: "readme.txt", content: encoder.encode("hi") },
          { name: "google.com!acme.test!1!2.xml", content: encoder.encode(xml) },
        ]),
      ),
    ).toBe(xml);
    expect(
      unpackDmarcReport(zip([{ name: "r.XML", content: encoder.encode(xml), stored: true }])),
    ).toBe(xml);
    expect(unpackDmarcReport(encoder.encode(`﻿${xml}`))).toBe(xml);
  });

  test("ignores anything else", () => {
    expect(unpackDmarcReport(encoder.encode("Hello there"))).toBeNull();
    expect(unpackDmarcReport(encoder.encode("<html><body>hi</body></html>"))).toBeNull();
  });

  test("refuses archives that unpack too large", () => {
    const bomb = new Uint8Array(MAX_DMARC_REPORT_BYTES + 1);
    expect(() => unpackDmarcReport(gzipSync(bomb))).toThrow(DmarcReportError);
    expect(() => unpackDmarcReport(zip([{ name: "a.xml", content: bomb }]))).toThrow("too large");
  });

  test("refuses a zip without a report", () => {
    expect(() => unpackDmarcReport(zip([{ name: "a.txt", content: encoder.encode("x") }]))).toThrow(
      "no XML report",
    );
  });
});

describe("parseXml", () => {
  test("decodes entities, CDATA and strips namespace prefixes", () => {
    const element = parseXml(
      '<?xml version="1.0"?><!-- hi --><a:root xmlns:a="x"><b attr="1>2">Tom &amp; &#x4A;erry</b><c><![CDATA[<raw>]]></c><d/></a:root>',
    );
    expect(element.name).toBe("root");
    expect(element.children.map((c) => [c.name, c.text])).toEqual([
      ["b", "Tom & Jerry"],
      ["c", "<raw>"],
      ["d", ""],
    ]);
  });

  test("refuses DTDs and entity declarations", () => {
    expect(() =>
      parseXml(
        '<!DOCTYPE feedback [<!ENTITY x SYSTEM "file:///etc/passwd">]><feedback>&x;</feedback>',
      ),
    ).toThrow("document type declarations are not allowed");
  });

  test("refuses malformed documents", () => {
    expect(() => parseXml("<a><b></a>")).toThrow(DmarcReportError);
    expect(() => parseXml("<a>")).toThrow(DmarcReportError);
    expect(() => parseXml("<a/><b/>")).toThrow(DmarcReportError);
    expect(() => parseXml(`${"<a>".repeat(40)}${"</a>".repeat(40)}`)).toThrow("nested too deeply");
  });
});

describe("parseDmarcAggregateReport", () => {
  test("maps a report", () => {
    const report = parseDmarcAggregateReport(dmarcReportXml(REPORT));
    expect(report).toMatchObject({
      reporterOrg: "google.com",
      reporterEmail: "noreply-dmarc-support@google.com",
      reportId: "13845021974128475",
      periodBegin: new Date("2026-10-09T00:00:00Z"),
      periodEnd: new Date("2026-10-09T23:59:59Z"),
      policyPublished: { domain: "acme.test", p: "none", pct: 100, adkim: "r", aspf: "r" },
      truncated: false,
    });
    expect(report.records).toEqual([
      {
        sourceIp: "54.240.8.12",
        count: 1200,
        disposition: "none",
        dkim: "pass",
        spf: "pass",
        reasons: [],
        headerFrom: "acme.test",
        envelopeFrom: "send.acme.test",
        authResults: {
          dkim: [{ domain: "acme.test", selector: "tok1", result: "pass" }],
          spf: [{ domain: "send.acme.test", scope: "mfrom", result: "pass" }],
        },
      },
      {
        sourceIp: "2001:db8::1",
        count: 4,
        disposition: "none",
        dkim: "fail",
        spf: "fail",
        reasons: [],
        headerFrom: "acme.test",
        envelopeFrom: null,
        authResults: {
          dkim: [],
          spf: [{ domain: "acme.test", scope: "mfrom", result: "fail" }],
        },
      },
    ]);
  });

  test("reads RFC 9990's namespaced format", () => {
    const report = parseDmarcAggregateReport(dmarcReportXml({ ...REPORT, rfc9990: true }));
    expect(report.records).toHaveLength(2);
    expect(report.policyPublished.domain).toBe("acme.test");
  });

  test("reads a Microsoft-style report with prefixes, reasons and a pass disposition", () => {
    const xml = `<?xml version="1.0"?>
<feedback xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <version>1.0</version>
  <report_metadata>
    <org_name>Enterprise Outlook</org_name>
    <email>dmarcreport@microsoft.com</email>
    <report_id>a3f1c0d2e4b54b2e9a8f</report_id>
    <date_range><begin>1760054400</begin><end>1760140800</end></date_range>
  </report_metadata>
  <policy_published>
    <domain>ACME.test</domain><adkim>r</adkim><aspf>r</aspf><p>quarantine</p><sp>quarantine</sp><pct>100</pct><fo>0</fo>
  </policy_published>
  <record>
    <row>
      <source_ip>40.107.1.2</source_ip><count>3</count>
      <policy_evaluated>
        <disposition>pass</disposition><dkim>fail</dkim><spf>pass</spf>
        <reason><type>forwarded</type><comment>mailing list</comment></reason>
      </policy_evaluated>
    </row>
    <identifiers><envelope_to>contoso.com</envelope_to><envelope_from>acme.test</envelope_from><header_from>acme.test</header_from></identifiers>
    <auth_results><spf><domain>acme.test</domain><scope>mfrom</scope><result>pass</result></spf></auth_results>
  </record>
</feedback>`;
    const report = parseDmarcAggregateReport(xml);
    expect(report.reporterOrg).toBe("Enterprise Outlook");
    expect(report.policyPublished).toMatchObject({ domain: "acme.test", p: "quarantine" });
    expect(report.records[0]).toMatchObject({
      disposition: "none",
      dkim: "fail",
      spf: "pass",
      reasons: [{ type: "forwarded", comment: "mailing list" }],
    });
  });

  test("keeps at most MAX_DMARC_REPORT_RECORDS records", () => {
    const record = { sourceIp: "192.0.2.1", count: 1, dkim: "pass", spf: "pass" } as const;
    const report = parseDmarcAggregateReport(
      dmarcReportXml({
        ...REPORT,
        records: Array.from({ length: MAX_DMARC_REPORT_RECORDS + 3 }, () => record),
      }),
    );
    expect(report.records).toHaveLength(MAX_DMARC_REPORT_RECORDS);
    expect(report.truncated).toBe(true);
  });

  test("refuses reports missing what identifies them", () => {
    expect(() => parseDmarcAggregateReport("<feedback><report_metadata/></feedback>")).toThrow(
      "<org_name>",
    );
    expect(() => parseDmarcAggregateReport("<other/>")).toThrow("<feedback>");
    const badCount = dmarcReportXml(REPORT).replace("<count>1200</count>", "<count>-1</count>");
    expect(() => parseDmarcAggregateReport(badCount)).toThrow("<count>");
  });
});
