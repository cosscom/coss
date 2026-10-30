using Coss.Forms;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Forms.Submissions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "form_submission",
              "id": "id",
              "form_id": "form_id",
              "status": "pending_confirmation",
              "data": {
                "data": "data"
              },
              "submitter_email": "submitter_email",
              "files": [
                {
                  "id": "id",
                  "field": "field",
                  "filename": "filename",
                  "content_type": "content_type",
                  "size": 1000000
                },
                {
                  "id": "id",
                  "field": "field",
                  "filename": "filename",
                  "content_type": "content_type",
                  "size": 1000000
                }
              ],
              "spam_reason": "honeypot",
              "risk": {
                "assessment_id": "assessment_id",
                "decision": "allow",
                "score": 1.1
              },
              "ip": "ip",
              "user_agent": "user_agent",
              "origin": "origin",
              "referrer": "referrer",
              "confirmed_at": "2024-01-15T09:30:00.000Z",
              "accepted_at": "2024-01-15T09:30:00.000Z",
              "released_at": "2024-01-15T09:30:00.000Z",
              "sandbox": true,
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/forms/id/submissions/submission_id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Forms.Submissions.GetAsync(
            new GetSubmissionsRequest { Id = "id", SubmissionId = "submission_id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "form_submission",
              "id": "fsub_01kd2m9a0b1c2d3e4f5g6h7j8k",
              "form_id": "form_01kd2m8n3p4q5r6s7t8v9w0x1y",
              "status": "accepted",
              "data": {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "message": "Hello!"
              },
              "submitter_email": "ada@example.com",
              "files": [
                {
                  "id": "ffile_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "field": "field",
                  "filename": "filename",
                  "content_type": "content_type",
                  "size": 1000000
                }
              ],
              "spam_reason": null,
              "risk": {
                "assessment_id": "rsk_01kd2m9a0b1c2d3e4f5g6h7j8n",
                "decision": "allow",
                "score": 0.04
              },
              "ip": "203.0.113.7",
              "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
              "origin": "https://www.example.com",
              "referrer": "https://www.example.com/contact",
              "confirmed_at": null,
              "accepted_at": "2026-10-29T10:00:00.000Z",
              "released_at": null,
              "sandbox": false,
              "created_at": "2026-10-29T10:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/forms/form_01kd2m8n3p4q5r6s7t8v9w0x1y/submissions/fsub_01kd2m9a0b1c2d3e4f5g6h7j8k"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Forms.Submissions.GetAsync(
            new GetSubmissionsRequest
            {
                Id = "form_01kd2m8n3p4q5r6s7t8v9w0x1y",
                SubmissionId = "fsub_01kd2m9a0b1c2d3e4f5g6h7j8k",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
