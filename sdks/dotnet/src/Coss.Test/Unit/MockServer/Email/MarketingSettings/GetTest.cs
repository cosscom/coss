using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.MarketingSettings;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "marketing_settings",
              "display_name": "display_name",
              "mailing_address": "mailing_address",
              "double_opt_in_default": true,
              "confirmation_from": "confirmation_from",
              "confirmation_subject": "confirmation_subject",
              "confirmation_html": "confirmation_html",
              "confirmation_text": "confirmation_text",
              "confirmed_redirect_url": "confirmed_redirect_url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/marketing_settings")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.MarketingSettings.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "marketing_settings",
              "display_name": "Acme",
              "mailing_address": "Acme Inc., 548 Market St, San Francisco, CA 94104, USA",
              "double_opt_in_default": true,
              "confirmation_from": "Acme <news@acme.com>",
              "confirmed_redirect_url": "https://acme.com/welcome"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/marketing_settings")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.MarketingSettings.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
