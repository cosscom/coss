using Coss.Forms;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Forms.Submissions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RemoveTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "form_submission",
              "id": "id",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/forms/id/submissions/submission_id")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Forms.Submissions.RemoveAsync(
            new RemoveSubmissionsRequest { Id = "id", SubmissionId = "submission_id" }
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
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/forms/form_01kd2m8n3p4q5r6s7t8v9w0x1y/submissions/fsub_01kd2m9a0b1c2d3e4f5g6h7j8k"
                    )
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Forms.Submissions.RemoveAsync(
            new RemoveSubmissionsRequest
            {
                Id = "form_01kd2m8n3p4q5r6s7t8v9w0x1y",
                SubmissionId = "fsub_01kd2m9a0b1c2d3e4f5g6h7j8k",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
