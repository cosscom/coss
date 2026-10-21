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
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("audience_id")]
    public string? AudienceId { get; set; }

    [JsonPropertyName("segment_id")]
    public string? SegmentId { get; set; }

    [JsonPropertyName("topic")]
    public string? Topic { get; set; }

    [JsonPropertyName("from")]
    public string? From { get; set; }

    [JsonPropertyName("reply_to")]
    public IEnumerable<string>? ReplyTo { get; set; }

    /// <summary>
    /// May use `{{{contact.&lt;key&gt;|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).
    /// </summary>
    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    [JsonPropertyName("preview_text")]
    public string? PreviewText { get; set; }

    [JsonPropertyName("html")]
    public string? Html { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("tracking")]
    public UpdateBroadcastRequestTracking? Tracking { get; set; }

    [JsonPropertyName("rate_per_second")]
    public int? RatePerSecond { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
