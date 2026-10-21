using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Tracking;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "tracking_settings",
              "default": {
                "object": "tracking_rule",
                "id": "id",
                "category": "category",
                "opens": true,
                "clicks": true,
                "unsubscribe": true,
                "created_at": "2024-01-15T09:30:00.000Z",
                "updated_at": "2024-01-15T09:30:00.000Z"
              },
              "categories": [
                {
                  "object": "tracking_rule",
                  "id": "id",
                  "category": "category",
                  "opens": true,
                  "clicks": true,
                  "unsubscribe": true,
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "tracking_rule",
                  "id": "id",
                  "category": "category",
                  "opens": true,
                  "clicks": true,
                  "unsubscribe": true,
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/tracking_settings")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Tracking.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "tracking_settings",
              "default": {
                "object": "tracking_rule",
                "id": "etr_01k7c8k1d9w4x2b7n3m5q6r8st",
                "category": null,
                "opens": true,
                "clicks": true,
                "unsubscribe": false,
                "created_at": "2026-01-15T09:30:00.000Z",
                "updated_at": "2026-01-15T09:30:00.000Z"
              },
              "categories": [
                {
                  "object": "tracking_rule",
                  "id": "etr_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "category": "password-reset",
                  "opens": false,
                  "clicks": false,
                  "unsubscribe": false,
                  "created_at": "2026-01-16T10:00:00.000Z",
                  "updated_at": "2026-01-16T10:00:00.000Z"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/tracking_settings")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Tracking.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
