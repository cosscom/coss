using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SendEmailBatchRequest
{
    /// <summary>
    /// Makes retries safe: a repeated request with the same key and body returns the original email (with its current status) instead of sending again, for 24 hours. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    /// <summary>
    /// Up to 100 emails, each accepted by `POST /v1/emails`. The batch is accepted or rejected as a whole.
    /// </summary>
    [JsonPropertyName("emails")]
    public IEnumerable<SendEmailRequest> Emails { get; set; } = new List<SendEmailRequest>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
