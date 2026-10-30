using Coss;
using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Sign.Requests;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "title": "x",
              "documents": [
                {
                  "document_id": "document_id"
                },
                {
                  "document_id": "document_id"
                }
              ],
              "signers": [
                {
                  "name": "x",
                  "email": "email",
                  "fields": [
                    {
                      "type": "signature",
                      "page": 1000000,
                      "x": 1.1,
                      "y": 1.1,
                      "width": 1.1,
                      "height": 1.1
                    },
                    {
                      "type": "signature",
                      "page": 1000000,
                      "x": 1.1,
                      "y": 1.1,
                      "width": 1.1,
                      "height": 1.1
                    }
                  ]
                },
                {
                  "name": "x",
                  "email": "email",
                  "fields": [
                    {
                      "type": "signature",
                      "page": 1000000,
                      "x": 1.1,
                      "y": 1.1,
                      "width": 1.1,
                      "height": 1.1
                    },
                    {
                      "type": "signature",
                      "page": 1000000,
                      "x": 1.1,
                      "y": 1.1,
                      "width": 1.1,
                      "height": 1.1
                    }
                  ]
                }
              ],
              "reminder_interval_days": null
            }
            """;

        const string mockResponse = """
            {
              "object": "sign_request",
              "id": "id",
              "status": "draft",
              "title": "title",
              "message": "message",
              "signing_order": "parallel",
              "documents": [
                {
                  "id": "id",
                  "filename": "filename",
                  "sha256": "sha256",
                  "page_count": 1000000
                },
                {
                  "id": "id",
                  "filename": "filename",
                  "sha256": "sha256",
                  "page_count": 1000000
                }
              ],
              "signers": [
                {
                  "object": "sign_signer",
                  "id": "id",
                  "name": "name",
                  "email": "email",
                  "order": 1000000,
                  "delivery": "embedded",
                  "authentication": "email_link",
                  "status": "pending",
                  "client_ref": "client_ref",
                  "viewed_at": "2024-01-15T09:30:00.000Z",
                  "signed_at": "2024-01-15T09:30:00.000Z",
                  "declined_at": "2024-01-15T09:30:00.000Z",
                  "decline_reason": "decline_reason"
                },
                {
                  "object": "sign_signer",
                  "id": "id",
                  "name": "name",
                  "email": "email",
                  "order": 1000000,
                  "delivery": "embedded",
                  "authentication": "email_link",
                  "status": "pending",
                  "client_ref": "client_ref",
                  "viewed_at": "2024-01-15T09:30:00.000Z",
                  "signed_at": "2024-01-15T09:30:00.000Z",
                  "declined_at": "2024-01-15T09:30:00.000Z",
                  "decline_reason": "decline_reason"
                }
              ],
              "fields": [
                {
                  "object": "sign_field",
                  "id": "id",
                  "signer_id": "signer_id",
                  "document_id": "document_id",
                  "type": "signature",
                  "page": 1000000,
                  "x": 1.1,
                  "y": 1.1,
                  "width": 1.1,
                  "height": 1.1,
                  "required": true,
                  "label": "label",
                  "anchor": "anchor"
                },
                {
                  "object": "sign_field",
                  "id": "id",
                  "signer_id": "signer_id",
                  "document_id": "document_id",
                  "type": "signature",
                  "page": 1000000,
                  "x": 1.1,
                  "y": 1.1,
                  "width": 1.1,
                  "height": 1.1,
                  "required": true,
                  "label": "label",
                  "anchor": "anchor"
                }
              ],
              "metadata": {
                "metadata": "metadata"
              },
              "sandbox": true,
              "reminder_interval_days": 1000000,
              "expires_at": "2024-01-15T09:30:00.000Z",
              "expired_at": "2024-01-15T09:30:00.000Z",
              "sent_at": "2024-01-15T09:30:00.000Z",
              "completed_at": "2024-01-15T09:30:00.000Z",
              "canceled_at": "2024-01-15T09:30:00.000Z",
              "declined_at": "2024-01-15T09:30:00.000Z",
              "signed_document": {
                "sha256": "sha256",
                "sealed_at": "2024-01-15T09:30:00.000Z"
              },
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/requests")
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

        var response = await Client.Sign.Requests.CreateAsync(
            new CreateSignRequestRequest
            {
                Title = "x",
                Message = null,
                Documents = new List<
                    OneOf<
                        CreateSignRequestRequestDocumentsItemDocumentId,
                        CreateSignRequestRequestDocumentsItemContent
                    >
                >()
                {
                    new CreateSignRequestRequestDocumentsItemDocumentId
                    {
                        DocumentId = "document_id",
                    },
                    new CreateSignRequestRequestDocumentsItemDocumentId
                    {
                        DocumentId = "document_id",
                    },
                },
                Signers = new List<CreateSignRequestRequestSignersItem>()
                {
                    new CreateSignRequestRequestSignersItem
                    {
                        Name = "x",
                        Email = "email",
                        Delivery = null,
                        Order = null,
                        ClientRef = null,
                        Fields = new List<OneOf<SignFieldInputDocument, SignFieldInputAnchor>>()
                        {
                            new SignFieldInputDocument
                            {
                                Type = SignFieldInputDocumentType.Signature,
                                Required = null,
                                Label = null,
                                Document = null,
                                Page = 1000000,
                                X = 1.1,
                                Y = 1.1,
                                Width = 1.1,
                                Height = 1.1,
                            },
                            new SignFieldInputDocument
                            {
                                Type = SignFieldInputDocumentType.Signature,
                                Required = null,
                                Label = null,
                                Document = null,
                                Page = 1000000,
                                X = 1.1,
                                Y = 1.1,
                                Width = 1.1,
                                Height = 1.1,
                            },
                        },
                    },
                    new CreateSignRequestRequestSignersItem
                    {
                        Name = "x",
                        Email = "email",
                        Delivery = null,
                        Order = null,
                        ClientRef = null,
                        Fields = new List<OneOf<SignFieldInputDocument, SignFieldInputAnchor>>()
                        {
                            new SignFieldInputDocument
                            {
                                Type = SignFieldInputDocumentType.Signature,
                                Required = null,
                                Label = null,
                                Document = null,
                                Page = 1000000,
                                X = 1.1,
                                Y = 1.1,
                                Width = 1.1,
                                Height = 1.1,
                            },
                            new SignFieldInputDocument
                            {
                                Type = SignFieldInputDocumentType.Signature,
                                Required = null,
                                Label = null,
                                Document = null,
                                Page = 1000000,
                                X = 1.1,
                                Y = 1.1,
                                Width = 1.1,
                                Height = 1.1,
                            },
                        },
                    },
                },
                SigningOrder = null,
                ExpiresAt = null,
                Metadata = null,
                ReminderIntervalDays = null,
                Send = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "title": "Services agreement",
              "documents": [
                {
                  "document_id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz"
                }
              ],
              "signers": [
                {
                  "name": "Ada Lovelace",
                  "email": "ada@example.com",
                  "fields": [
                    {
                      "type": "signature",
                      "anchor": "{{signature:signer_1}}"
                    },
                    {
                      "type": "date_signed",
                      "page": 2,
                      "x": 320,
                      "y": 640,
                      "width": 120,
                      "height": 18
                    }
                  ]
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "sign_request",
              "id": "sreq_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "status": "sent",
              "title": "Services agreement",
              "message": null,
              "signing_order": "parallel",
              "documents": [
                {
                  "id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "filename": "agreement.pdf",
                  "sha256": "9f2c6c0f0e1d4b7a8c5e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c",
                  "page_count": 2
                }
              ],
              "signers": [
                {
                  "object": "sign_signer",
                  "id": "ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "name": "Ada Lovelace",
                  "email": "ada@example.com",
                  "order": 1,
                  "delivery": "email",
                  "authentication": "email_link",
                  "status": "pending",
                  "client_ref": null,
                  "viewed_at": null,
                  "signed_at": null,
                  "declined_at": null,
                  "decline_reason": null
                }
              ],
              "fields": [
                {
                  "object": "sign_field",
                  "id": "sfld_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "signer_id": "ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "document_id": "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "type": "signature",
                  "page": 2,
                  "x": 72,
                  "y": 640,
                  "width": 140,
                  "height": 12,
                  "required": true,
                  "label": null,
                  "anchor": "{{signature:signer_1}}"
                }
              ],
              "metadata": {
                "key": "value"
              },
              "sandbox": false,
              "reminder_interval_days": 3,
              "expires_at": null,
              "expired_at": null,
              "sent_at": "2026-10-26T15:04:05.000Z",
              "completed_at": null,
              "canceled_at": null,
              "declined_at": null,
              "signed_document": null,
              "created_at": "2026-10-26T15:04:05.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/requests")
                    .WithHeader("Idempotency-Key", "welcome-user-123")
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

        var response = await Client.Sign.Requests.CreateAsync(
            new CreateSignRequestRequest
            {
                IdempotencyKey = "welcome-user-123",
                Title = "Services agreement",
                Documents = new List<
                    OneOf<
                        CreateSignRequestRequestDocumentsItemDocumentId,
                        CreateSignRequestRequestDocumentsItemContent
                    >
                >()
                {
                    new CreateSignRequestRequestDocumentsItemDocumentId
                    {
                        DocumentId = "sdoc_01k7c8m4q2f3e9v6t5r1n0p8yz",
                    },
                },
                Signers = new List<CreateSignRequestRequestSignersItem>()
                {
                    new CreateSignRequestRequestSignersItem
                    {
                        Name = "Ada Lovelace",
                        Email = "ada@example.com",
                        Fields = new List<OneOf<SignFieldInputDocument, SignFieldInputAnchor>>()
                        {
                            new SignFieldInputAnchor
                            {
                                Type = SignFieldInputAnchorType.Signature,
                                Anchor = "{{signature:signer_1}}",
                            },
                            new SignFieldInputDocument
                            {
                                Type = SignFieldInputDocumentType.DateSigned,
                                Page = 2,
                                X = 320,
                                Y = 640,
                                Width = 120,
                                Height = 18,
                            },
                        },
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
