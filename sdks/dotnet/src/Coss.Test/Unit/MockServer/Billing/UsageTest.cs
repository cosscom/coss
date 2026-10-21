using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Billing;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UsageTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "usage",
                  "meter": "email.recipients",
                  "dimension": "dimension",
                  "environment_id": "environment_id",
                  "project_id": "project_id",
                  "api_key_id": "api_key_id",
                  "user_id": "user_id",
                  "start": "2024-01-15T09:30:00.000Z",
                  "end": "2024-01-15T09:30:00.000Z",
                  "quantity": 1000000
                },
                {
                  "object": "usage",
                  "meter": "email.recipients",
                  "dimension": "dimension",
                  "environment_id": "environment_id",
                  "project_id": "project_id",
                  "api_key_id": "api_key_id",
                  "user_id": "user_id",
                  "start": "2024-01-15T09:30:00.000Z",
                  "end": "2024-01-15T09:30:00.000Z",
                  "quantity": 1000000
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/billing/usage").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.UsageAsync(new UsageBillingRequest());
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
                  "object": "usage",
                  "meter": "email.recipients",
                  "dimension": null,
                  "environment_id": null,
                  "project_id": null,
                  "api_key_id": null,
                  "user_id": null,
                  "start": "2026-10-12T00:00:00.000Z",
                  "end": "2026-10-13T00:00:00.000Z",
                  "quantity": 4200
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/billing/usage").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.UsageAsync(new UsageBillingRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
