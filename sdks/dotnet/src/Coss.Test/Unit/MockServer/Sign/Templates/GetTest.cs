using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "sign_template",
              "id": "id",
              "name": "name",
              "title": "title",
              "message": "message",
              "signing_order": "parallel",
              "documents": [
                {
                  "id": "id",
                  "filename": "filename",
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
                  ]
                },
                {
                  "id": "id",
                  "filename": "filename",
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
                  ]
                }
              ],
              "roles": [
                {
                  "key": "key",
                  "name": "name"
                },
                {
                  "key": "key",
                  "name": "name"
                }
              ],
              "fields": [
                {
                  "id": "id",
                  "role": "role",
                  "document_id": "document_id",
                  "type": "signature",
                  "page": 1000000,
                  "x": 1.1,
                  "y": 1.1,
                  "width": 1.1,
                  "height": 1.1,
                  "required": true,
                  "label": "label",
                  "merge_key": "merge_key"
                },
                {
                  "id": "id",
                  "role": "role",
                  "document_id": "document_id",
                  "type": "signature",
                  "page": 1000000,
                  "x": 1.1,
                  "y": 1.1,
                  "width": 1.1,
                  "height": 1.1,
                  "required": true,
                  "label": "label",
                  "merge_key": "merge_key"
                }
              ],
              "ready": true,
              "sandbox": true,
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/templates/id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Templates.GetAsync(
            new Coss.Sign.GetTemplatesRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "sign_template",
              "id": "stpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "name": "Mutual NDA",
              "title": null,
              "message": null,
              "signing_order": "parallel",
              "documents": [
                {
                  "id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "filename": "nda.pdf",
                  "sha256": "9f2c6c0f0e1d4b7a8c5e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c",
                  "page_count": 1,
                  "pages": [
                    {
                      "width": 612,
                      "height": 792
                    }
                  ]
                }
              ],
              "roles": [
                {
                  "key": "client",
                  "name": "Client"
                }
              ],
              "fields": [
                {
                  "id": "stfld_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "role": "client",
                  "document_id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "type": "signature",
                  "page": 1,
                  "x": 72,
                  "y": 640,
                  "width": 160,
                  "height": 30,
                  "required": true,
                  "label": null,
                  "merge_key": null
                }
              ],
              "ready": true,
              "sandbox": false,
              "created_at": "2026-10-26T15:04:05.000Z",
              "updated_at": "2026-10-26T15:04:05.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/templates/stpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Templates.GetAsync(
            new Coss.Sign.GetTemplatesRequest { Id = "stpl_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
