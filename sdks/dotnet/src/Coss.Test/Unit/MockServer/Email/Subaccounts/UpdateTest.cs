using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Subaccounts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "uid": null
            }
            """;

        const string mockResponse = """
            {
              "object": "subaccount",
              "id": "id",
              "uid": "uid",
              "name": "name",
              "metadata": {
                "metadata": "metadata"
              },
              "status": "active",
              "quotas": {
                "recipients_per_day": 100000000,
                "recipients_per_second": 100000000,
                "burst": 100000000
              },
              "reputation": {
                "status": "good",
                "trigger": "trigger",
                "changed_at": "2024-01-15T09:30:00.000Z",
                "reinstated_at": "2024-01-15T09:30:00.000Z"
              },
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/subaccounts/subaccount")
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

        var response = await Client.Email.Subaccounts.UpdateAsync(
            new UpdateSubaccountRequest
            {
                Subaccount = "subaccount",
                Name = null,
                Uid = null,
                Metadata = null,
                Status = null,
                Quotas = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "status": "disabled"
            }
            """;

        const string mockResponse = """
            {
              "object": "subaccount",
              "id": "sub_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "uid": "user_8812",
              "name": "Acme Bakery",
              "metadata": {
                "plan": "pro"
              },
              "status": "active",
              "quotas": {
                "recipients_per_day": 5000,
                "recipients_per_second": 5,
                "burst": 50
              },
              "reputation": {
                "status": "good",
                "trigger": null,
                "changed_at": null,
                "reinstated_at": null
              },
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/subaccounts/user_8812")
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

        var response = await Client.Email.Subaccounts.UpdateAsync(
            new UpdateSubaccountRequest
            {
                Subaccount = "user_8812",
                Status = UpdateSubaccountRequestStatus.Disabled,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
