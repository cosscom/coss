using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CheckRiskLimitRequest
{
    /// <summary>
    /// Makes retries safe: a repeated allowed check with the same key is answered again without taking more tokens, for an hour. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    /// <summary>
    /// The bucket's name.
    /// </summary>
    [JsonPropertyName("bucket")]
    public required string Bucket { get; set; }

    /// <summary>
    /// Who or what is limited: a user id, an email address, an IP address… coss.com keeps only a keyed hash of it.
    /// </summary>
    [JsonPropertyName("key")]
    public required string Key { get; set; }

    /// <summary>
    /// Tokens this request takes. Default 1.
    /// </summary>
    [JsonPropertyName("cost")]
    public int? Cost { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
