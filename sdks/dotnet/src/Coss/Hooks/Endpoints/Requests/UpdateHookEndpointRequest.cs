using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record UpdateHookEndpointRequest
{
    /// <summary>
    /// The application's `id` (`happ_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Application { get; set; }

    /// <summary>
    /// The endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string EndpointId { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Event types delivered to this endpoint (existing, unarchived ones). An empty array means every type, including ones added later.
    /// </summary>
    [JsonPropertyName("filter_types")]
    public IEnumerable<string>? FilterTypes { get; set; }

    /// <summary>
    /// At most this many requests per second to this endpoint.
    /// </summary>
    [JsonPropertyName("rate_limit_per_second")]
    public int? RateLimitPerSecond { get; set; }

    /// <summary>
    /// Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
