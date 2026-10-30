using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Sign.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
              "title": null,
              "message": null
            }
            """;

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
                    .WithPath("/v1/sign/templates")
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

        var response = await Client.Sign.Templates.CreateAsync(
            new CreateSignTemplateRequest
            {
                Name = "x",
                Title = null,
                Message = null,
                SigningOrder = null,
                Documents = null,
                Roles = null,
                Fields = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "Mutual NDA",
              "documents": [
                {
                  "document_id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz"
                }
              ],
              "roles": [
                {
                  "key": "client",
                  "name": "Client"
                },
                {
                  "key": "company",
                  "name": "Company"
                }
              ],
              "fields": [
                {
                  "type": "signature",
                  "anchor": "{{signature:client}}",
                  "role": "client"
                },
                {
                  "type": "text",
                  "page": 1,
                  "x": 72,
                  "y": 140,
                  "width": 200,
                  "height": 18,
                  "role": "client",
                  "merge_key": "client_company"
                },
                {
                  "type": "signature",
                  "anchor": "{{signature:company}}",
                  "role": "company"
                }
              ]
            }
            """;

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
                    .WithPath("/v1/sign/templates")
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

        var response = await Client.Sign.Templates.CreateAsync(
            new CreateSignTemplateRequest
            {
                Name = "Mutual NDA",
                Documents = new List<
                    OneOf<
                        CreateSignTemplateRequestDocumentsItemDocumentId,
                        CreateSignTemplateRequestDocumentsItemContent
                    >
                >()
                {
                    new CreateSignTemplateRequestDocumentsItemDocumentId
                    {
                        DocumentId = "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
                    },
                },
                Roles = new List<CreateSignTemplateRequestRolesItem>()
                {
                    new CreateSignTemplateRequestRolesItem { Key = "client", Name = "Client" },
                    new CreateSignTemplateRequestRolesItem { Key = "company", Name = "Company" },
                },
                Fields = new List<
                    OneOf<
                        CreateSignTemplateRequestFieldsItemDocument,
                        CreateSignTemplateRequestFieldsItemAnchor
                    >
                >()
                {
                    new CreateSignTemplateRequestFieldsItemAnchor
                    {
                        Type = CreateSignTemplateRequestFieldsItemAnchorType.Signature,
                        Anchor = "{{signature:client}}",
                        Role = "client",
                    },
                    new CreateSignTemplateRequestFieldsItemDocument
                    {
                        Type = CreateSignTemplateRequestFieldsItemDocumentType.Text,
                        Page = 1,
                        X = 72,
                        Y = 140,
                        Width = 200,
                        Height = 18,
                        Role = "client",
                        MergeKey = "client_company",
                    },
                    new CreateSignTemplateRequestFieldsItemAnchor
                    {
                        Type = CreateSignTemplateRequestFieldsItemAnchorType.Signature,
                        Anchor = "{{signature:company}}",
                        Role = "company",
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
