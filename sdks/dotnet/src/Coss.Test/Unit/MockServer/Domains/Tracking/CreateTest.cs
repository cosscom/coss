using Coss.Domains;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Domains.Tracking;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "hostname": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "domain",
              "id": "id",
              "name": "name",
              "status": "pending",
              "can_send": true,
              "region": "region",
              "mail_from_domain": "mail_from_domain",
              "mail_from_status": "pending",
              "records": [
                {
                  "purpose": "dkim",
                  "type": "CNAME",
                  "name": "name",
                  "value": "value",
                  "priority": 1000000,
                  "required": true,
                  "status": "verified",
                  "found": [
                    "found",
                    "found"
                  ]
                },
                {
                  "purpose": "dkim",
                  "type": "CNAME",
                  "name": "name",
                  "value": "value",
                  "priority": 1000000,
                  "required": true,
                  "status": "verified",
                  "found": [
                    "found",
                    "found"
                  ]
                }
              ],
              "created_at": "2024-01-15T09:30:00.000Z",
              "last_checked_at": "2024-01-15T09:30:00.000Z",
              "verified_at": "2024-01-15T09:30:00.000Z",
              "failed_at": "2024-01-15T09:30:00.000Z",
              "tracking": {
                "hostname": "hostname",
                "status": "pending",
                "record": {
                  "type": "CNAME",
                  "name": "name",
                  "value": "value",
                  "status": "verified",
                  "found": [
                    "found",
                    "found"
                  ]
                },
                "message": "message",
                "created_at": "2024-01-15T09:30:00.000Z",
                "last_checked_at": "2024-01-15T09:30:00.000Z",
                "activated_at": "2024-01-15T09:30:00.000Z",
                "failed_at": "2024-01-15T09:30:00.000Z"
              },
              "receiving": {
                "hostname": "hostname",
                "environment_id": "environment_id",
                "record": {
                  "type": "MX",
                  "name": "name",
                  "value": "value",
                  "priority": 1000000,
                  "status": "verified",
                  "found": [
                    "found",
                    "found"
                  ]
                },
                "created_at": "2024-01-15T09:30:00.000Z",
                "last_checked_at": "2024-01-15T09:30:00.000Z"
              },
              "bimi": {
                "status": "not_checked",
                "name": "name",
                "record": "record",
                "logo_url": "logo_url",
                "certificate_url": "certificate_url",
                "dmarc_policy": "none",
                "issues": [
                  {
                    "code": "dmarc_missing",
                    "message": "message"
                  },
                  {
                    "code": "dmarc_missing",
                    "message": "message"
                  }
                ]
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/id/tracking")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Tracking.CreateAsync(
            new CreateTrackingDomainRequest { Id = "id", Hostname = "x" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "hostname": "links.acme.com"
            }
            """;

        const string mockResponse = """
            {
              "object": "domain",
              "id": "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "name": "acme.com",
              "status": "verified",
              "can_send": true,
              "region": "us-east-1",
              "mail_from_domain": "send.acme.com",
              "mail_from_status": "success",
              "records": [
                {
                  "purpose": "dkim",
                  "type": "CNAME",
                  "name": "x7f3k2m9qp4ld8sv6hwz1nyc5rbtgj0e._domainkey.acme.com",
                  "value": "x7f3k2m9qp4ld8sv6hwz1nyc5rbtgj0e.dkim.amazonses.com",
                  "required": true,
                  "status": "verified",
                  "found": [
                    "found"
                  ]
                },
                {
                  "purpose": "mail_from_mx",
                  "type": "MX",
                  "name": "send.acme.com",
                  "value": "feedback-smtp.us-east-1.amazonses.com",
                  "priority": 10,
                  "required": true,
                  "status": "verified",
                  "found": [
                    "found"
                  ]
                },
                {
                  "purpose": "mail_from_spf",
                  "type": "TXT",
                  "name": "send.acme.com",
                  "value": "v=spf1 include:amazonses.com ~all",
                  "required": true,
                  "status": "verified",
                  "found": [
                    "found"
                  ]
                },
                {
                  "purpose": "dmarc",
                  "type": "TXT",
                  "name": "_dmarc.acme.com",
                  "value": "v=DMARC1; p=none;",
                  "required": false,
                  "status": "verified",
                  "found": [
                    "found"
                  ]
                }
              ],
              "created_at": "2026-01-15T09:30:00.000Z",
              "last_checked_at": "2026-01-15T09:42:10.000Z",
              "verified_at": "2026-01-15T09:42:10.000Z",
              "tracking": {
                "hostname": "links.acme.com",
                "status": "active",
                "record": {
                  "type": "CNAME",
                  "name": "links.acme.com",
                  "value": "track.cosslinks.com",
                  "status": "verified",
                  "found": [
                    "found"
                  ]
                },
                "created_at": "2026-01-15T09:45:00.000Z",
                "last_checked_at": "2026-01-15T09:52:00.000Z",
                "activated_at": "2026-01-15T09:52:00.000Z"
              },
              "bimi": {
                "status": "configured",
                "name": "default._bimi.acme.com",
                "record": "v=BIMI1; l=https://acme.com/brand/logo.svg; a=https://acme.com/brand/vmc.pem",
                "logo_url": "https://acme.com/brand/logo.svg",
                "certificate_url": "https://acme.com/brand/vmc.pem",
                "dmarc_policy": "reject",
                "issues": [
                  {
                    "code": "dmarc_missing",
                    "message": "message"
                  }
                ]
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/domains/dom_01k7c8m4q2f3e9v6t5r1n0p8yz/tracking")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Domains.Tracking.CreateAsync(
            new CreateTrackingDomainRequest
            {
                Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Hostname = "links.acme.com",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
