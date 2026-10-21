using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateBroadcastRequest
{
    /// <summary>
    /// The broadcast's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Shown only to you.
    /// </summary>
    [Optional]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("audience_id")]
    public Optional<string?> AudienceId { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("segment_id")]
    public Optional<string?> SegmentId { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("topic")]
    public Optional<string?> Topic { get; set; }

    [Optional]
    [JsonPropertyName("from")]
    public string? From { get; set; }

    [Optional]
    [JsonPropertyName("reply_to")]
    public IEnumerable<string>? ReplyTo { get; set; }

    /// <summary>
    /// May use `{{{contact.&lt;key&gt;|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).
    /// </summary>
    [Optional]
    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("preview_text")]
    public Optional<string?> PreviewText { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("html")]
    public Optional<string?> Html { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("text")]
    public Optional<string?> Text { get; set; }

    [Optional]
    [JsonPropertyName("tracking")]
    public UpdateBroadcastRequestTracking? Tracking { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("rate_per_second")]
    public Optional<int?> RatePerSecond { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
