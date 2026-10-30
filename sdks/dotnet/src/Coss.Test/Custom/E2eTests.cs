// Hand-written (listed in .fernignore): end to end against the API's test app.
//
//   bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
//   COSS_E2E='<that JSON>' dotnet test
//
// Skipped without COSS_E2E.

using System.Text.Json;
using Coss.Email;
using Coss.Hooks;
using NUnit.Framework;

namespace Coss.Test.Custom;

[TestFixture]
public class E2eTests
{
    private CossClient _coss = null!;

    [SetUp]
    public void Client()
    {
        var raw = System.Environment.GetEnvironmentVariable("COSS_E2E");
        if (string.IsNullOrEmpty(raw))
        {
            Assert.Ignore("COSS_E2E is not set (see the file comment)");
        }
        var server = JsonDocument.Parse(raw!).RootElement;
        _coss = new CossClient(
            server.GetProperty("sandbox_key").GetString(),
            clientOptions: new ClientOptions { BaseUrl = server.GetProperty("base_url").GetString()! }
        );
    }

    [Test]
    public async Task SendGetAndList()
    {
        var email = await _coss.Email.SendAsync(new SendEmailBody
        {
            Body = new SendEmailRequest
            {
                From = "Acme <hello@acme.test>",
                To = new[] { "ada@example.com" },
                Subject = "Hello from .NET",
                Text = "It works.",
            },
        });
        Assert.That(email.Id, Does.StartWith("email_"));
        Assert.That((await _coss.Email.GetAsync(new GetEmailRequest { Id = email.Id })).Id, Is.EqualTo(email.Id));
        Assert.That((await _coss.Email.ListAsync(new ListEmailRequest { Limit = 1 })).Data.Count(), Is.EqualTo(1));
    }

    [Test]
    public void Errors()
    {
        var invalid = Assert.ThrowsAsync<UnprocessableEntityError>(async () => await _coss.Email.SendAsync(new SendEmailBody
        {
            Body = new SendEmailRequest { From = "not an address", To = new[] { "ada@example.com" }, Text = "Hi" },
        }));
        Assert.That(invalid!.Body.Error.Issues, Is.Not.Empty);
        var notFound = Assert.ThrowsAsync<NotFoundError>(async () =>
            await _coss.Email.GetAsync(new GetEmailRequest { Id = "email_01k00000000000000000000000" }));
        Assert.That(notFound!.Body.Error.RequestId, Does.StartWith("req_"));
    }

    [Test]
    public async Task CsvExport()
    {
        var csv = await _coss.Email.Suppressions.ExportAsync(new ExportSuppressionsRequest());
        Assert.That(csv, Does.StartWith("address,scope,reason,"));
    }

    [Test]
    public async Task ReadsParse()
    {
        await _coss.Environment.GetAsync();
        await _coss.Reputation.GetAsync();
        await _coss.Billing.GetAsync();
        await _coss.Logs.ListAsync(new ListLogsRequest());
        await _coss.AuditEvents.ListAsync(new ListAuditEventsRequest());
        await _coss.Domains.ListAsync(new ListDomainsRequest());
        await _coss.WebhookEndpoints.ListAsync();
        await _coss.Email.Suppressions.ListAsync(new ListSuppressionsRequest());
        await _coss.Email.Templates.ListAsync(new ListTemplatesRequest());
        await _coss.Email.Contacts.ListAsync(new ListContactsRequest());
        await _coss.Email.Tracking.GetAsync();
        await _coss.Hooks.Applications.ListAsync(new ListApplicationsRequest());
        await _coss.Risk.Settings.GetAsync();
        await _coss.Risk.Rules.ListAsync();
    }
}
