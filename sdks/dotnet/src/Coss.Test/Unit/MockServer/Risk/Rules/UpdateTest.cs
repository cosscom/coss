using Coss.Risk;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk.Rules;

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
              "object": "risk_rule",
              "id": "id",
              "name": "name",
              "enabled": true,
              "position": 1000000,
              "events": [
                "signup",
                "signup"
              ],
              "match": "all",
              "conditions": [
                {
                  "field": "email.valid",
                  "operator": "is",
                  "value": true
                },
                {
                  "field": "email.valid",
                  "operator": "is",
                  "value": true
                }
              ],
              "action": "allow",
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/rules/id")
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

        var response = await Client.Risk.Rules.UpdateAsync(
            new UpdateRiskRuleRequest
            {
                Id = "id",
                Name = null,
                Enabled = null,
                Position = null,
                Events = null,
                Match = null,
                Conditions = null,
                Action = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "enabled": false
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_rule",
              "id": "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "name": "Disposable email from a data center",
              "enabled": true,
              "position": 0,
              "events": [
                "signup"
              ],
              "match": "all",
              "conditions": [
                {
                  "field": "email.disposable",
                  "operator": "is",
                  "value": true
                },
                {
                  "field": "ip.hosting",
                  "operator": "is",
                  "value": true
                }
              ],
              "action": "block",
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/rules/rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz")
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

        var response = await Client.Risk.Rules.UpdateAsync(
            new UpdateRiskRuleRequest { Id = "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz", Enabled = false }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
