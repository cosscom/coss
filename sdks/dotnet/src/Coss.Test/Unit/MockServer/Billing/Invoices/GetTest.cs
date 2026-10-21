using Coss.Billing;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Billing.Invoices;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
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
              "pdf_url": "pdf_url",
              "lines": [
                {
                  "object": "invoice_line",
                  "id": "id",
                  "kind": "plan_fee",
                  "description": "description",
                  "meter": "email.recipients",
                  "dimension": "dimension",
                  "quantity": 1000000,
                  "included_quantity": 1000000,
                  "unit_price": "unit_price",
                  "amount": 1000000,
                  "period": {
                    "start": "2024-01-15T09:30:00.000Z",
                    "end": "2024-01-15T09:30:00.000Z"
                  }
                },
                {
                  "object": "invoice_line",
                  "id": "id",
                  "kind": "plan_fee",
                  "description": "description",
                  "meter": "email.recipients",
                  "dimension": "dimension",
                  "quantity": 1000000,
                  "included_quantity": 1000000,
                  "unit_price": "unit_price",
                  "amount": 1000000,
                  "period": {
                    "start": "2024-01-15T09:30:00.000Z",
                    "end": "2024-01-15T09:30:00.000Z"
                  }
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/billing/invoices/id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.Invoices.GetAsync(new GetInvoicesRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
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
              "pdf_url": "https://pay.stripe.com/invoice/acct_123/test_YWNjdF8x/pdf",
              "lines": [
                {
                  "object": "invoice_line",
                  "id": "invl_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "kind": "usage",
                  "description": "Email: 120,000 recipients",
                  "meter": "email.recipients",
                  "dimension": null,
                  "quantity": 120000,
                  "included_quantity": 0,
                  "unit_price": "0.0004",
                  "amount": 4800,
                  "period": {
                    "start": "2026-10-01T00:00:00.000Z",
                    "end": "2026-11-01T00:00:00.000Z"
                  }
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/billing/invoices/inv_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.Invoices.GetAsync(
            new GetInvoicesRequest { Id = "inv_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
