using Coss.Domains.Dmarc;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Domains.Dmarc.Reports;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "dmarc_report",
              "id": "id",
              "domain_id": "domain_id",
              "reporter": {
                "org_name": "org_name",
                "email": "email"
              },
              "report_id": "report_id",
              "period_start": "2024-01-15T09:30:00.000Z",
              "period_end": "2024-01-15T09:30:00.000Z",
              "policy_published": {
                "domain": "domain",
                "p": "p",
                "sp": "sp",
                "np": "np",
                "adkim": "adkim",
                "aspf": "aspf",
                "pct": 1000000,
                "testing": "testing"
              },
              "messages": 1000000,
              "passing": 1000000,
              "truncated": true,
              "received_at": "2024-01-15T09:30:00.000Z",
              "records": [
                {
                  "source_ip": "source_ip",
                  "count": 1000000,
                  "disposition": "none",
                  "dkim": "pass",
                  "spf": "pass",
                  "dmarc_pass": true,
                  "header_from": "header_from",
                  "envelope_from": "envelope_from",
                  "via_coss": true,
                  "auth_results": {
                    "dkim": [
                      {
                        "domain": "domain",
                        "selector": "selector",
                        "result": "result"
                      },
                      {
                        "domain": "domain",
                        "selector": "selector",
                        "result": "result"
                      }
                    ],
                    "spf": [
                      {
                        "domain": "domain",
                        "scope": "scope",
                        "result": "result"
                      },
                      {
                        "domain": "domain",
                        "scope": "scope",
                        "result": "result"
                      }
                    ]
                  },
                  "reasons": [
                    {
                      "type": "type",
                      "comment": "comment"
                    },
                    {
                      "type": "type",
                      "comment": "comment"
                    }
                  ]
                },
                {
                  "source_ip": "source_ip",
                  "count": 1000000,
                  "disposition": "none",
                  "dkim": "pass",
                  "spf": "pass",
                  "dmarc_pass": true,
                  "header_from": "header_from",
                  "envelope_from": "envelope_from",
                  "via_coss": true,
                  "auth_results": {
                    "dkim": [
                      {
                        "domain": "domain",
                        "selector": "selector",
                        "result": "result"
                      },
                      {
                        "domain": "domain",
                        "selector": "selector",
                        "result": "result"
                      }
                    ],
                    "spf": [
                      {
                        "domain": "domain",
                        "scope": "scope",
                        "result": "result"
                      },
                      {
                        "domain": "domain",
                        "scope": "scope",
                        "result": "result"
                      }
                    ]
                  },
                  "reasons": [
                    {
                      "type": "type",
                      "comment": "comment"
                    },
                    {
                      "type": "type",
                      "comment": "comment"
                    }
                  ]
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/id/dmarc/reports/report_id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Dmarc.Reports.GetAsync(
            new GetReportsRequest { Id = "id", ReportId = "report_id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "dmarc_report",
              "id": "dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "domain_id": "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "reporter": {
                "org_name": "google.com",
                "email": "noreply-dmarc-support@google.com"
              },
              "report_id": "13845021974128475",
              "period_start": "2026-10-09T00:00:00.000Z",
              "period_end": "2026-10-09T23:59:59.000Z",
              "policy_published": {
                "domain": "acme.com",
                "p": "none",
                "adkim": "r",
                "aspf": "r",
                "pct": 100
              },
              "messages": 1204,
              "passing": 1200,
              "truncated": false,
              "received_at": "2026-10-10T03:12:44.000Z",
              "records": [
                {
                  "source_ip": "54.240.8.12",
                  "count": 1200,
                  "disposition": "none",
                  "dkim": "pass",
                  "spf": "pass",
                  "dmarc_pass": true,
                  "header_from": "acme.com",
                  "envelope_from": "send.acme.com",
                  "via_coss": true,
                  "auth_results": {
                    "dkim": [
                      {
                        "domain": "acme.com",
                        "selector": "x7f3k2m9qp4ld8sv6hwz1nyc5rbtgj0e",
                        "result": "pass"
                      }
                    ],
                    "spf": [
                      {
                        "domain": "send.acme.com",
                        "scope": "mfrom",
                        "result": "pass"
                      }
                    ]
                  },
                  "reasons": [
                    {
                      "type": "type"
                    }
                  ]
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/domains/dom_01k7c8m4q2f3e9v6t5r1n0p8yz/dmarc/reports/dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Dmarc.Reports.GetAsync(
            new GetReportsRequest
            {
                Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
                ReportId = "dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
