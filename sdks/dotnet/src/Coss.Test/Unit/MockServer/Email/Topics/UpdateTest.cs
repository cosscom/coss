using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Topics;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "topic",
              "id": "id",
              "key": "key",
              "name": "name",
              "description": "description",
              "default_subscription": "opt_in",
              "visibility": "public",
              "position": 1000000,
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/topics/id")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Topics.UpdateAsync(
            new UpdateTopicRequest
            {
                Id = "id",
                Name = null,
                Description = null,
                DefaultSubscription = null,
                Visibility = null,
                Position = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "visibility": "private"
            }
            """;

        const string mockResponse = """
            {
              "object": "topic",
              "id": "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "key": "newsletter",
              "name": "Newsletter",
              "description": "Monthly product news.",
              "default_subscription": "opt_in",
              "visibility": "public",
              "position": 0,
              "created_at": "2026-10-10T12:00:00.000Z",
              "updated_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/topics/topic_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Topics.UpdateAsync(
            new UpdateTopicRequest
            {
                Id = "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Visibility = UpdateTopicRequestVisibility.Private,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
