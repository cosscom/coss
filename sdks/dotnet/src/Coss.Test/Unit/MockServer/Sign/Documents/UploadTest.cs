using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Documents;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UploadTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "filename": "x",
              "content": "x"
            }
            """;

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
                    .WithPath("/v1/sign/documents")
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

        var response = await Client.Sign.Documents.UploadAsync(
            new UploadSignDocumentRequest { Filename = "x", Content = "x" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "filename": "agreement.pdf",
              "content": "JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNCAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgMyAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDUgMCBSIF0KPj4KZW5kb2JqCgo1IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMTIwCj4+CnN0cmVhbQp4nG2KMQrCQBBF+znF1II4O7s7fxckYEjEwkaYC4hEiWgREc9vtLCSV/3330Stk/CHx4VWu+H2Gp7j6biE1JKKoFQOyn4mTex7Ct80MJQhwn6ndY5WDdZbQEKGWo4bFbQzf56fm3fexoAOXcN+JV9Q73SgN3RWIBIKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE2IDAwMDAwIG4gCjAwMDAwMDAwNzYgMDAwMDAgbiAKMDAwMDAwMDEyNiAwMDAwMCBuIAowMDAwMDAwMjI0IDAwMDAwIG4gCjAwMDAwMDA0MTkgMDAwMDAgbiAKCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAyIDAgUgo+PgoKc3RhcnR4cmVmCjYxMgolJUVPRg=="
            }
            """;

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
                    .WithPath("/v1/sign/documents")
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

        var response = await Client.Sign.Documents.UploadAsync(
            new UploadSignDocumentRequest
            {
                Filename = "agreement.pdf",
                Content =
                    "JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNCAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgMyAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDUgMCBSIF0KPj4KZW5kb2JqCgo1IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMTIwCj4+CnN0cmVhbQp4nG2KMQrCQBBF+znF1II4O7s7fxckYEjEwkaYC4hEiWgREc9vtLCSV/3330Stk/CHx4VWu+H2Gp7j6biE1JKKoFQOyn4mTex7Ct80MJQhwn6ndY5WDdZbQEKGWo4bFbQzf56fm3fexoAOXcN+JV9Q73SgN3RWIBIKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE2IDAwMDAwIG4gCjAwMDAwMDAwNzYgMDAwMDAgbiAKMDAwMDAwMDEyNiAwMDAwMCBuIAowMDAwMDAwMjI0IDAwMDAwIG4gCjAwMDAwMDA0MTkgMDAwMDAgbiAKCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAyIDAgUgo+PgoKc3RhcnR4cmVmCjYxMgolJUVPRg==",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
