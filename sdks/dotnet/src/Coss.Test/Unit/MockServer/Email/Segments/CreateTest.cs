using Coss;
using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Email.Segments;

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
              "filter": {
                "version": 1.1,
                "match": "all",
                "conditions": [
                  {
                    "field": "property",
                    "key": "key",
                    "op": "eq"
                  },
                  {
                    "field": "property",
                    "key": "key",
                    "op": "eq"
                  }
                ]
              }
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/segments")
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

        var response = await Client.Email.Segments.CreateAsync(
            new CreateSegmentRequest
            {
                Name = "x",
                Filter = new SegmentFilter
                {
                    Version = 1.1,
                    Match = SegmentFilterMatch.All,
                    Conditions = new List<
                        OneOf<
                            SegmentFilterConditionsItemKey,
                            SegmentFilterConditionsItemOne,
                            SegmentFilterConditionsItemAudienceId,
                            SegmentFilterConditionsItemTopic,
                            SegmentFilterConditionsItemField,
                            SegmentFilterConditionsItemConditions
                        >
                    >()
                    {
                        new SegmentFilterConditionsItemKey
                        {
                            Field = SegmentFilterConditionsItemKeyField.Property,
                            Key = "key",
                            Op = SegmentFilterConditionsItemKeyOp.Eq,
                            Value = null,
                        },
                        new SegmentFilterConditionsItemKey
                        {
                            Field = SegmentFilterConditionsItemKeyField.Property,
                            Key = "key",
                            Op = SegmentFilterConditionsItemKeyOp.Eq,
                            Value = null,
                        },
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
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
              }
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/segments")
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

        var response = await Client.Email.Segments.CreateAsync(
            new CreateSegmentRequest
            {
                Name = "Pro customers",
                Filter = new SegmentFilter
                {
                    Version = 1,
                    Match = SegmentFilterMatch.All,
                    Conditions = new List<
                        OneOf<
                            SegmentFilterConditionsItemKey,
                            SegmentFilterConditionsItemOne,
                            SegmentFilterConditionsItemAudienceId,
                            SegmentFilterConditionsItemTopic,
                            SegmentFilterConditionsItemField,
                            SegmentFilterConditionsItemConditions
                        >
                    >()
                    {
                        new SegmentFilterConditionsItemKey
                        {
                            Field = SegmentFilterConditionsItemKeyField.Property,
                            Key = "plan",
                            Op = SegmentFilterConditionsItemKeyOp.Eq,
                            Value = "pro",
                        },
                        new SegmentFilterConditionsItemConditions
                        {
                            Match = SegmentFilterConditionsItemConditionsMatch.Any,
                            Conditions =
                                new List<SegmentFilterConditionsItemConditionsConditionsItem>()
                                {
                                    new SegmentFilterConditionsItemConditionsConditionsItem(
                                        new Coss.SegmentFilterConditionsItemConditionsConditionsItem.Email(
                                            new SegmentFilterConditionsItemConditionsConditionsItemEmail
                                            {
                                                Op =
                                                    SegmentFilterConditionsItemConditionsConditionsItemEmailOp.EndsWith,
                                                Value = "@acme.com",
                                            }
                                        )
                                    ),
                                    new SegmentFilterConditionsItemConditionsConditionsItem(
                                        new SegmentFilterConditionsItemConditionsConditionsItem.Audience(
                                            new SegmentFilterConditionsItemConditionsConditionsItemAudience
                                            {
                                                Op =
                                                    SegmentFilterConditionsItemConditionsConditionsItemAudienceOp.In,
                                                AudienceId = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
                                            }
                                        )
                                    ),
                                },
                        },
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
