using Coss.Domains.Dmarc;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Domains.Dmarc.Reports;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
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
                  "received_at": "2024-01-15T09:30:00.000Z"
                },
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
                  "received_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/id/dmarc/reports")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Dmarc.Reports.ListAsync(
            new ListReportsRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
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
                    "sp": null,
                    "np": null,
                    "adkim": "r",
                    "aspf": "r",
                    "pct": 100,
                    "testing": null
                  },
                  "messages": 1204,
                  "passing": 1200,
                  "truncated": false,
                  "received_at": "2026-10-10T03:12:44.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/dom_01k7c8m4q2f3e9v6t5r1n0p8yz/dmarc/reports")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Dmarc.Reports.ListAsync(
            new ListReportsRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
