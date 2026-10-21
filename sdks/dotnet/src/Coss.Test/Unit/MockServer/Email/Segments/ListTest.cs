using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Segments;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "segment",
                  "id": "id",
                  "name": "name",
                  "filter": {
                    "version": 1.1,
                    "match": "all",
                    "conditions": [
                      {
                        "field": "property",
                        "key": "key",
                        "op": "eq",
                        "value": "value"
                      },
                      {
                        "field": "property",
                        "key": "key",
                        "op": "eq",
                        "value": "value"
                      }
                    ]
                  },
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "segment",
                  "id": "id",
                  "name": "name",
                  "filter": {
                    "version": 1.1,
                    "match": "all",
                    "conditions": [
                      {
                        "field": "property",
                        "key": "key",
                        "op": "eq",
                        "value": "value"
                      },
                      {
                        "field": "property",
                        "key": "key",
                        "op": "eq",
                        "value": "value"
                      }
                    ]
                  },
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/segments").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Segments.ListAsync(new ListSegmentsRequest());
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
                  "object": "segment",
                  "id": "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "name": "Pro customers",
                  "filter": {
                    "version": 1,
                    "match": "all",
                    "conditions": [
                      {
                        "field": "property",
                        "key": "plan",
                        "op": "eq",
                        "value": "pro"
                      },
                      {
                        "match": "any",
                        "conditions": [
                          {
                            "field": "email",
                            "op": "ends_with",
                            "value": "@acme.com"
                          },
                          {
                            "field": "audience",
                            "op": "in",
                            "audience_id": "aud_01k7c8m4q2f3e9v6t5r1n0p8yz"
                          }
                        ]
                      }
                    ]
                  },
                  "created_at": "2026-10-10T12:00:00.000Z",
                  "updated_at": "2026-10-10T12:00:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/segments").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Segments.ListAsync(new ListSegmentsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
