using Coss.Billing;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Billing.Invoices;

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
                  "object": "invoice",
                  "id": "id",
                  "number": "number",
                  "kind": "period",
                  "status": "open",
                  "currency": "usd",
                  "period": {
                    "start": "2024-01-15T09:30:00.000Z",
                    "end": "2024-01-15T09:30:00.000Z"
                  },
                  "subtotal": 1000000,
                  "discount": 1000000,
                  "credit": 1000000,
                  "tax": 1000000,
                  "total": 1000000,
                  "amount_paid": 1000000,
                  "amount_due": 1000000,
                  "collection_method": "charge_automatically",
                  "due_at": "2024-01-15T09:30:00.000Z",
                  "finalized_at": "2024-01-15T09:30:00.000Z",
                  "paid_at": "2024-01-15T09:30:00.000Z",
                  "voided_at": "2024-01-15T09:30:00.000Z",
                  "hosted_url": "hosted_url",
                  "pdf_url": "pdf_url"
                },
                {
                  "object": "invoice",
                  "id": "id",
                  "number": "number",
                  "kind": "period",
                  "status": "open",
                  "currency": "usd",
                  "period": {
                    "start": "2024-01-15T09:30:00.000Z",
                    "end": "2024-01-15T09:30:00.000Z"
                  },
                  "subtotal": 1000000,
                  "discount": 1000000,
                  "credit": 1000000,
                  "tax": 1000000,
                  "total": 1000000,
                  "amount_paid": 1000000,
                  "amount_due": 1000000,
                  "collection_method": "charge_automatically",
                  "due_at": "2024-01-15T09:30:00.000Z",
                  "finalized_at": "2024-01-15T09:30:00.000Z",
                  "paid_at": "2024-01-15T09:30:00.000Z",
                  "voided_at": "2024-01-15T09:30:00.000Z",
                  "hosted_url": "hosted_url",
                  "pdf_url": "pdf_url"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/billing/invoices")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.Invoices.ListAsync(new ListInvoicesRequest());
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
                  "object": "invoice",
                  "id": "inv_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "number": "COSS-000042",
                  "kind": "period",
                  "status": "paid",
                  "currency": "usd",
                  "period": {
                    "start": "2026-10-01T00:00:00.000Z",
                    "end": "2026-11-01T00:00:00.000Z"
                  },
                  "subtotal": 7300,
                  "discount": 0,
                  "credit": 2500,
                  "tax": 0,
                  "total": 4800,
                  "amount_paid": 4800,
                  "amount_due": 0,
                  "collection_method": "charge_automatically",
                  "due_at": "2026-11-01T00:20:00.000Z",
                  "finalized_at": "2026-11-01T00:20:00.000Z",
                  "paid_at": "2026-11-01T00:21:00.000Z",
                  "voided_at": null,
                  "hosted_url": "https://invoice.stripe.com/i/acct_123/test_YWNjdF8x",
                  "pdf_url": "https://pay.stripe.com/invoice/acct_123/test_YWNjdF8x/pdf"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/billing/invoices")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.Invoices.ListAsync(new ListInvoicesRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
