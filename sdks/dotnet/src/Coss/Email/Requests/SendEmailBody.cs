using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SendEmailBody
{
    /// <summary>
    /// Makes retries safe: a repeated request with the same key and body returns the original email (with its current status) instead of sending again, for 24 hours. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    [JsonIgnore]
    public required SendEmailRequest Body { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
