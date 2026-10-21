// Hand-written (listed in .fernignore): the generated client's request behaviour (headers,
// retries, idempotency keys).

using System.Net;
using System.Text;
using System.Text.Json;
using NUnit.Framework;

namespace Coss.Test.Custom;

[TestFixture]
public class ClientBehaviourTests
{
    private sealed class FakeApi(params int[] statuses) : HttpMessageHandler
    {
        private static readonly string Email = JsonDocument
            .Parse(File.ReadAllText(Paths.Repository("apps/api/openapi.json")))
            .RootElement.GetProperty("components").GetProperty("schemas").GetProperty("Email")
            .GetProperty("examples")[0]
            .GetRawText();

        public List<HttpRequestMessage> Requests { get; } = [];
        public List<string> Bodies { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            Bodies.Add(request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken));
            var status = Requests.Count <= statuses.Length ? statuses[Requests.Count - 1] : 200;
            var body = status >= 300
                ? """{"error":{"type":"api_error","code":"x","message":"No.","request_id":"req_1"}}"""
                : Email;
            var response = new HttpResponseMessage((HttpStatusCode)status)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            };
            response.Headers.Add("Retry-After", "0");
            return response;
        }
    }

    private static CossClient Client(FakeApi api) =>
        new("coss_test_key", clientOptions: new ClientOptions { BaseUrl = "https://api.coss.test", HttpClient = new HttpClient(api) });

    [Test]
    public async Task SendsTheCossHeaders()
    {
        var api = new FakeApi();
        await Client(api).Email.GetAsync(new GetEmailRequest { Id = "email_1" });
        var request = api.Requests[0];
        var version = File.ReadAllText(Paths.Repository("sdks/VERSION")).Trim();
        Assert.That(request.RequestUri!.AbsolutePath, Is.EqualTo("/v1/emails/email_1"));
        Assert.That(request.Headers.Authorization!.ToString(), Is.EqualTo("Bearer coss_test_key"));
        Assert.That(request.Headers.UserAgent.ToString(), Is.EqualTo($"coss-dotnet/{version}"));
        Assert.That(request.Headers.GetValues("Coss-Version").Single(), Is.Not.Empty);
    }

    [Test]
    public async Task RetriesAPostWithOneIdempotencyKey()
    {
        var api = new FakeApi(503, 409);
        await Client(api).Email.SendAsync(new SendEmailBody
        {
            Body = new SendEmailRequest { From = "hello@acme.test", To = new[] { "someone@example.com" }, Subject = "Hi", Text = "Hi" },
        });
        Assert.That(api.Requests, Has.Count.EqualTo(3));
        var keys = api.Requests.Select(r => r.Headers.GetValues("Idempotency-Key").Single()).Distinct().ToList();
        Assert.That(keys, Has.Count.EqualTo(1));
        Assert.That(keys[0], Is.Not.Empty);
    }

    [Test]
    public async Task KeepsTheCallersIdempotencyKey()
    {
        var api = new FakeApi();
        await Client(api).Email.SendAsync(new SendEmailBody
        {
            IdempotencyKey = "order-42",
            Body = new SendEmailRequest { From = "hello@acme.test", To = new[] { "someone@example.com" }, Subject = "Hi", Text = "Hi" },
        });
        Assert.That(api.Requests[0].Headers.GetValues("Idempotency-Key").Single(), Is.EqualTo("order-42"));
    }

    [Test]
    public async Task SendsAnExplicitNullAndLeavesOmittedFieldsOut()
    {
        var api = new FakeApi();
        try
        {
            await Client(api).WebhookEndpoints.UpdateAsync(new UpdateWebhookEndpointRequest { Id = "we_1", Description = null });
        }
        catch (Exception)
        {
            // The fake answers with an email, not an endpoint: only the request matters here.
        }
        var body = JsonSerializer.Serialize(JsonDocument.Parse(api.Bodies[0]).RootElement);
        Assert.That(body, Is.EqualTo("""{"description":null}"""));
    }

    [TestCase(400)]
    [TestCase(402)]
    [TestCase(404)]
    [TestCase(422)]
    public void NeverRetriesClientErrors(int status)
    {
        var api = new FakeApi(status);
        var error = Assert.ThrowsAsync(Is.InstanceOf<CossClientApiException>(), async () => await Client(api).Email.GetAsync(new GetEmailRequest { Id = "email_1" }));
        Assert.That(((CossClientApiException)error!).StatusCode, Is.EqualTo(status));
        Assert.That(api.Requests, Has.Count.EqualTo(1));
    }

    [Test]
    public void NeverRetriesWhatTheApiDoesNotDeduplicate()
    {
        var api = new FakeApi(503);
        Assert.ThrowsAsync(Is.InstanceOf<CossClientApiException>(), async () =>
            await Client(api).WebhookEndpoints.CreateAsync(new CreateWebhookEndpointRequest { Url = "https://example.com/hooks" }));
        Assert.That(api.Requests, Has.Count.EqualTo(1));
    }
}
