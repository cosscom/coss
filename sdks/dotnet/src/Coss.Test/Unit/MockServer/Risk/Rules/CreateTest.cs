using Coss;
using Coss.Risk;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk.Rules;

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
              "action": "allow"
            }
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
                    .WithPath("/v1/risk/rules")
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

        var response = await Client.Risk.Rules.CreateAsync(
            new CreateRiskRuleRequest
            {
                Name = "x",
                Enabled = null,
                Position = null,
                Events = null,
                Match = null,
                Conditions = new List<RiskRuleCondition>()
                {
                    new RiskRuleCondition
                    {
                        Field = RiskRuleConditionField.EmailValid,
                        Operator = RiskRuleConditionOperator.Is,
                        Value = true,
                    },
                    new RiskRuleCondition
                    {
                        Field = RiskRuleConditionField.EmailValid,
                        Operator = RiskRuleConditionOperator.Is,
                        Value = true,
                    },
                },
                Action = RiskDecision.Allow,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "Disposable email from a data center",
              "events": [
                "signup"
              ],
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
              "action": "block"
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
                    .WithPath("/v1/risk/rules")
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

        var response = await Client.Risk.Rules.CreateAsync(
            new CreateRiskRuleRequest
            {
                Name = "Disposable email from a data center",
                Events = new List<RiskEvent>() { RiskEvent.Signup },
                Conditions = new List<RiskRuleCondition>()
                {
                    new RiskRuleCondition
                    {
                        Field = RiskRuleConditionField.EmailDisposable,
                        Operator = RiskRuleConditionOperator.Is,
                        Value = true,
                    },
                    new RiskRuleCondition
                    {
                        Field = RiskRuleConditionField.IpHosting,
                        Operator = RiskRuleConditionOperator.Is,
                        Value = true,
                    },
                },
                Action = RiskDecision.Block,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
