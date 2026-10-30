using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Documents;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "sign_document",
              "id": "id",
              "filename": "filename",
              "size": 1000000,
              "sha256": "sha256",
              "page_count": 1000000,
              "pages": [
                {
                  "width": 1.1,
                  "height": 1.1
                },
                {
                  "width": 1.1,
                  "height": 1.1
                }
              ],
              "anchors": [
                {
                  "text": "text",
                  "page": 1000000,
                  "x": 1.1,
                  "y": 1.1,
                  "width": 1.1,
                  "height": 1.1
                },
                {
                  "text": "text",
                  "page": 1000000,
                  "x": 1.1,
                  "y": 1.1,
                  "width": 1.1,
                  "height": 1.1
                }
              ],
              "sandbox": true,
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/documents/id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Documents.GetAsync(new GetDocumentsRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "sign_document",
              "id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "filename": "agreement.pdf",
              "size": 48213,
              "sha256": "9f2c6c0f0e1d4b7a8c5e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c",
              "page_count": 2,
              "pages": [
                {
                  "width": 612,
                  "height": 792
                },
                {
                  "width": 612,
                  "height": 792
                }
              ],
              "anchors": [
                {
                  "text": "{{signature:signer_1}}",
                  "page": 2,
                  "x": 72,
                  "y": 640,
                  "width": 140,
                  "height": 12
                }
              ],
              "sandbox": false,
              "created_at": "2026-10-26T15:04:05.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/documents/sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Documents.GetAsync(
            new GetDocumentsRequest { Id = "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
