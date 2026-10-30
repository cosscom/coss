using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CheckVerificationRequest
{
    /// <summary>
    /// Makes retries safe: a repeated check with the same key returns the same answer without spending another attempt. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    /// <summary>
    /// The verification to check. Give this or `to`.
    /// </summary>
    [Optional]
    [JsonPropertyName("verification_id")]
    public string? VerificationId { get; set; }

    /// <summary>
    /// The destination the code was sent to: checks its most recent verification. Give this or `verification_id`.
    /// </summary>
    [Optional]
    [JsonPropertyName("to")]
    public string? To { get; set; }

    /// <summary>
    /// The code the end user entered.
    /// </summary>
    [JsonPropertyName("code")]
    public required string Code { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
