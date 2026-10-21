// Hand-written (listed in .fernignore): integrations/conformance/webhooks.json, the cases every
// coss.com SDK runs.

using System.Text.Json;
using NUnit.Framework;

namespace Coss.Test.Custom;

[TestFixture]
public class WebhooksConformanceTests
{
    private static readonly JsonElement Fixture = JsonDocument
        .Parse(File.ReadAllText(Paths.Repository("integrations/conformance/webhooks.json")))
        .RootElement;

    private static IEnumerable<TestCaseData> Cases() =>
        Fixture.GetProperty("cases").EnumerateArray().Select(c => new TestCaseData(c).SetName(c.GetProperty("name").GetString()));

    [TestCaseSource(nameof(Cases))]
    public void Conformance(JsonElement c)
    {
        var headers = c.GetProperty("headers")
            .EnumerateObject()
            .Select(h => new KeyValuePair<string, string>(h.Name, h.Value.GetString()!))
            .ToList();
        JsonElement Setting(string name) => c.TryGetProperty(name, out var value) ? value : Fixture.GetProperty(name);
        var secret = Setting("secret").GetString()!;
        var now = DateTimeOffset.FromUnixTimeSeconds(Setting("now").GetInt64());
        var tolerance = TimeSpan.FromSeconds(Setting("tolerance_seconds").GetInt64());
        var payload = c.GetProperty("payload").GetString()!;
        var logDrain = c.GetProperty("kind").GetString() == "log_drain";
        var expect = c.GetProperty("expect");

        object Run() =>
            logDrain
                ? Webhooks.VerifyLogDrainBatch(payload, headers, secret, tolerance, now)
                : Webhooks.Verify(payload, headers, secret, tolerance, now);

        if (expect.TryGetProperty("error", out var error))
        {
            var thrown = Assert.Throws<WebhookVerificationException>(() => Run());
            Assert.That(thrown!.Message, Is.EqualTo(error.GetString()));
        }
        else
        {
            Assert.That(JsonSerializer.Serialize(Run()), Is.EqualTo(JsonSerializer.Serialize(expect.GetProperty("value"))));
        }
    }
}

internal static class Paths
{
    /// <summary>A path in the repository (tests run from bin/…).</summary>
    public static string Repository(string path)
    {
        var directory = new DirectoryInfo(TestContext.CurrentContext.TestDirectory);
        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "integrations")))
        {
            directory = directory.Parent;
        }
        return Path.Combine(directory?.FullName ?? throw new DirectoryNotFoundException("repository root"), path);
    }
}
