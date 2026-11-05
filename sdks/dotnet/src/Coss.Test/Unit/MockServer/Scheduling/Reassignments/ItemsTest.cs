using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.Reassignments;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ItemsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "scheduling.reassignment_item",
                  "id": "id",
                  "booking": "booking",
                  "from_host": "from_host",
                  "to_host": "to_host",
                  "outcome": "pending",
                  "error_code": "error_code"
                },
                {
                  "object": "scheduling.reassignment_item",
                  "id": "id",
                  "booking": "booking",
                  "from_host": "from_host",
                  "to_host": "to_host",
                  "outcome": "pending",
                  "error_code": "error_code"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/reassignments/id/items")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.Reassignments.ItemsAsync(
            new ItemsReassignmentsRequest { Id = "id" }
        );
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
                  "object": "scheduling.reassignment_item",
                  "id": "reasi_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "booking": "book_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "from_host": "host_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "to_host": "host_01kd2m9a0b1c2d3e4f5g6h7j8n",
                  "outcome": "reassigned",
                  "error_code": null
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/reassignments/id/items")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.Reassignments.ItemsAsync(
            new ItemsReassignmentsRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
