using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Requests;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AuditTrailTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "sign_event",
                  "id": "id",
                  "sequence": 1000000,
                  "type": "created",
                  "signer_id": "signer_id",
                  "actor": "api_key",
                  "ip_address": "ip_address",
                  "user_agent": "user_agent",
                  "details": {
                    "reason": "reason",
                    "document_sha256": {
                      "document_sha256": "document_sha256"
                    },
                    "disclosure_sha256": "disclosure_sha256",
                    "field_ids": [
                      "field_ids",
                      "field_ids"
                    ],
                    "signature_sha256": "signature_sha256",
                    "initials_sha256": "initials_sha256",
                    "session_id": "session_id",
                    "signed_document_sha256": "signed_document_sha256"
                  },
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "previous_hash": "previous_hash",
                  "hash": "hash"
                },
                {
                  "object": "sign_event",
                  "id": "id",
                  "sequence": 1000000,
                  "type": "created",
                  "signer_id": "signer_id",
                  "actor": "api_key",
                  "ip_address": "ip_address",
                  "user_agent": "user_agent",
                  "details": {
                    "reason": "reason",
                    "document_sha256": {
                      "document_sha256": "document_sha256"
                    },
                    "disclosure_sha256": "disclosure_sha256",
                    "field_ids": [
                      "field_ids",
                      "field_ids"
                    ],
                    "signature_sha256": "signature_sha256",
                    "initials_sha256": "initials_sha256",
                    "session_id": "session_id",
                    "signed_document_sha256": "signed_document_sha256"
                  },
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "previous_hash": "previous_hash",
                  "hash": "hash"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/requests/id/audit_trail")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Requests.AuditTrailAsync(
            new AuditTrailRequestsRequest { Id = "id" }
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
                  "object": "sign_event",
                  "id": "sevt_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "sequence": 1,
                  "type": "created",
                  "signer_id": null,
                  "actor": "api_key",
                  "ip_address": "203.0.113.7",
                  "user_agent": null,
                  "details": {
                    "document_sha256": {
                      "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz": "9f2c6c0f0e1d4b7a8c5e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c"
                    }
                  },
                  "occurred_at": "2026-10-26T15:04:05.000Z",
                  "previous_hash": null,
                  "hash": "9f2c6c0f0e1d4b7a8c5e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/requests/sreq_01k7c8m4q2f3e9v6t5r1n0p8yz/audit_trail")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Requests.AuditTrailAsync(
            new AuditTrailRequestsRequest { Id = "sreq_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
