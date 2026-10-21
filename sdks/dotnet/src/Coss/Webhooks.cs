// Hand-written (listed in .fernignore): verifies coss.com webhook and log drain requests (Standard
// Webhooks signatures), like the TypeScript SDK's verifyWebhook and verifyLogDrainBatch.

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Coss;

/// <summary>A webhook request failed verification: reject it (e.g. respond 400).</summary>
public sealed class WebhookVerificationException(string message) : Exception(message);

/// <summary>Verifies coss.com webhook and log drain requests.</summary>
public static class Webhooks
{
    private const string SecretPrefix = "whsec_";
    private static readonly TimeSpan DefaultTolerance = TimeSpan.FromMinutes(5);
    private static readonly Regex Timestamp = new("^[0-9]+$", RegexOptions.CultureInvariant);

    /// <summary>
    /// Checks the request's signature and age, then returns the parsed event. Pass the raw request
    /// body exactly as received (not re-serialized JSON), the request headers (names compare
    /// case-insensitively) and the endpoint's <c>whsec_…</c> signing secret. Throws
    /// <see cref="WebhookVerificationException"/> when the request must be rejected. The same check
    /// verifies messages your own users receive from coss.com Hooks: pass that endpoint's secret.
    /// </summary>
    public static JsonElement Verify(
        string payload,
        IEnumerable<KeyValuePair<string, string>> headers,
        string secret,
        TimeSpan? tolerance = null,
        DateTimeOffset? now = null
    )
    {
        VerifySignature(payload, headers, secret, tolerance ?? DefaultTolerance, now ?? DateTimeOffset.UtcNow);
        try
        {
            using var document = JsonDocument.Parse(payload);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            throw new WebhookVerificationException("The webhook body is not valid JSON.");
        }
    }

    /// <summary>
    /// Checks a log drain request's signature and age, then returns its lines (the body is NDJSON:
    /// one log line or audit event per line). The <c>webhook-id</c> header is the batch id, the
    /// same on every retry of a batch: use it (or each line's id) to skip a batch you already
    /// stored.
    /// </summary>
    public static IReadOnlyList<JsonElement> VerifyLogDrainBatch(
        string payload,
        IEnumerable<KeyValuePair<string, string>> headers,
        string secret,
        TimeSpan? tolerance = null,
        DateTimeOffset? now = null
    )
    {
        VerifySignature(payload, headers, secret, tolerance ?? DefaultTolerance, now ?? DateTimeOffset.UtcNow);
        var lines = new List<JsonElement>();
        foreach (var line in payload.Split('\n'))
        {
            if (line.Length == 0)
            {
                continue;
            }
            try
            {
                using var document = JsonDocument.Parse(line);
                lines.Add(document.RootElement.Clone());
            }
            catch (JsonException)
            {
                throw new WebhookVerificationException("The log drain body is not valid NDJSON.");
            }
        }
        return lines;
    }

    private static void VerifySignature(
        string payload,
        IEnumerable<KeyValuePair<string, string>> headers,
        string secret,
        TimeSpan tolerance,
        DateTimeOffset now
    )
    {
        var id = Header(headers, "webhook-id");
        var timestamp = Header(headers, "webhook-timestamp");
        var signatures = Header(headers, "webhook-signature");
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(timestamp) || string.IsNullOrEmpty(signatures))
        {
            throw new WebhookVerificationException("Missing webhook-id, webhook-timestamp or webhook-signature.");
        }
        if (
            !Timestamp.IsMatch(timestamp)
            || !long.TryParse(timestamp, out var sentAt)
            || Math.Abs(now.ToUnixTimeSeconds() - sentAt) > (long)tolerance.TotalSeconds
        )
        {
            throw new WebhookVerificationException("The webhook timestamp is too old or in the future.");
        }

        var key = DecodeBase64(secret.StartsWith(SecretPrefix, StringComparison.Ordinal) ? secret.Substring(SecretPrefix.Length) : secret);
        if (key is null || key.Length == 0)
        {
            throw new WebhookVerificationException("The signing secret is not a valid whsec_… secret.");
        }
        byte[] expected;
        using (var hmac = new HMACSHA256(key))
        {
            expected = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{id}.{timestamp}.{payload}"));
        }
        // Several space-separated signatures are sent while a secret is being rotated.
        foreach (var candidate in signatures!.Split(' '))
        {
            var comma = candidate.IndexOf(',');
            if (comma < 0 || candidate.Substring(0, comma) != "v1" || comma == candidate.Length - 1)
            {
                continue;
            }
            var signature = DecodeBase64(candidate.Substring(comma + 1));
            if (signature is not null && FixedTimeEquals(signature, expected))
            {
                return;
            }
        }
        throw new WebhookVerificationException("No webhook signature matches.");
    }

    private static string? Header(IEnumerable<KeyValuePair<string, string>> headers, string name)
    {
        foreach (var header in headers)
        {
            if (string.Equals(header.Key, name, StringComparison.OrdinalIgnoreCase))
            {
                return header.Value;
            }
        }
        return null;
    }

    private static byte[]? DecodeBase64(string value)
    {
        try
        {
            return Convert.FromBase64String(value);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    // CryptographicOperations.FixedTimeEquals isn't in .NET Standard 2.0.
    private static bool FixedTimeEquals(byte[] left, byte[] right)
    {
        if (left.Length != right.Length)
        {
            return false;
        }
        var difference = 0;
        for (var i = 0; i < left.Length; i++)
        {
            difference |= left[i] ^ right[i];
        }
        return difference == 0;
    }
}
