using Coss.Domains;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Domains.Dmarc;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "domain_dmarc",
              "domain_id": "domain_id",
              "report_address": "report_address",
              "record": {
                "value": "value",
                "p": "none",
                "sp": "none",
                "np": "none",
                "adkim": "r",
                "aspf": "r",
                "pct": 1000000,
                "t": "y",
                "rua": [
                  "rua",
                  "rua"
                ]
              },
              "policy": "none",
              "inherited_from": "inherited_from",
              "policy_since": "2024-01-15T09:30:00.000Z",
              "stage": "not_checked",
              "partial": true,
              "reporting": true,
              "ready": true,
              "next": {
                "kind": "publish",
                "policy": "none",
                "record": "record"
              },
              "checks": [
                {
                  "id": "coverage",
                  "ok": true,
                  "message": "message"
                },
                {
                  "id": "coverage",
                  "ok": true,
                  "message": "message"
                }
              ],
              "warnings": [
                "warnings",
                "warnings"
              ],
              "report_summary": {
                "period_start": "2024-01-15T09:30:00.000Z",
                "period_end": "2024-01-15T09:30:00.000Z",
                "reports": 1000000,
                "messages": 1000000,
                "passing": 1000000,
                "coss_messages": 1000000,
                "coss_passing": 1000000,
                "first_report_at": "2024-01-15T09:30:00.000Z",
                "last_report_at": "2024-01-15T09:30:00.000Z",
                "sources": [
                  {
                    "source_ip": "source_ip",
                    "header_from": "header_from",
                    "messages": 1000000,
                    "passing": 1000000,
                    "via_coss": true
                  },
                  {
                    "source_ip": "source_ip",
                    "header_from": "header_from",
                    "messages": 1000000,
                    "passing": 1000000,
                    "via_coss": true
                  }
                ]
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/id/dmarc")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Dmarc.GetAsync(new GetDmarcRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "domain_dmarc",
              "domain_id": "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "report_address": "dmarc-k3x9m2pq7rtw4nbc@inbound.coss.com",
              "record": {
                "value": "v=DMARC1; p=none; rua=mailto:dmarc-k3x9m2pq7rtw4nbc@inbound.coss.com;",
                "p": "none",
                "sp": null,
                "np": null,
                "adkim": null,
                "aspf": null,
                "pct": null,
                "t": null,
                "rua": [
                  "mailto:dmarc-k3x9m2pq7rtw4nbc@inbound.coss.com"
                ]
              },
              "policy": "none",
              "inherited_from": null,
              "policy_since": "2026-09-20T08:00:00.000Z",
              "stage": "monitoring",
              "partial": false,
              "reporting": true,
              "ready": true,
              "next": {
                "kind": "tighten",
                "policy": "quarantine",
                "record": "v=DMARC1; p=quarantine; rua=mailto:dmarc-k3x9m2pq7rtw4nbc@inbound.coss.com;"
              },
              "checks": [
                {
                  "id": "coss_pass_rate",
                  "ok": true,
                  "message": "100% of mail sent through coss.com passes DMARC (99% needed)."
                }
              ],
              "warnings": [
                "warnings"
              ],
              "report_summary": {
                "period_start": "2026-09-26T00:00:00.000Z",
                "period_end": "2026-10-10T00:00:00.000Z",
                "reports": 28,
                "messages": 1846,
                "passing": 1840,
                "coss_messages": 1840,
                "coss_passing": 1840,
                "first_report_at": "2026-09-21T00:00:00.000Z",
                "last_report_at": "2026-10-09T23:59:59.000Z",
                "sources": [
                  {
                    "source_ip": "54.240.8.12",
                    "header_from": "acme.com",
                    "messages": 1840,
                    "passing": 1840,
                    "via_coss": true
                  }
                ]
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/dom_01k7c8m4q2f3e9v6t5r1n0p8yz/dmarc")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Dmarc.GetAsync(
            new GetDmarcRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
