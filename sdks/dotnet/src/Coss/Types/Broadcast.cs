using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record Broadcast : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required BroadcastObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// `draft` (editable), `scheduled`, `sending`, `paused` (see `pause_reason`), `sent`, `canceled`, or `failed` (see `error`).
    /// </summary>
    [JsonPropertyName("status")]
    public required BroadcastStatus Status { get; set; }

    [Nullable]
    [JsonPropertyName("audience_id")]
    public string? AudienceId { get; set; }

    [Nullable]
    [JsonPropertyName("segment_id")]
    public string? SegmentId { get; set; }

    [Nullable]
    [JsonPropertyName("topic")]
    public string? Topic { get; set; }

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("reply_to")]
    public IEnumerable<string> ReplyTo { get; set; } = new List<string>();

    [JsonPropertyName("subject")]
    public required string Subject { get; set; }

    [Nullable]
    [JsonPropertyName("preview_text")]
    public string? PreviewText { get; set; }

    [Nullable]
    [JsonPropertyName("html")]
    public string? Html { get; set; }

    [Nullable]
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("tracking")]
    public required BroadcastTracking Tracking { get; set; }

    [Nullable]
    [JsonPropertyName("rate_per_second")]
    public long? RatePerSecond { get; set; }

    [Nullable]
    [JsonPropertyName("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    [Nullable]
    [JsonPropertyName("started_at")]
    public DateTime? StartedAt { get; set; }

    [Nullable]
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Nullable]
    [JsonPropertyName("canceled_at")]
    public DateTime? CanceledAt { get; set; }

    /// <summary>
    /// How many contacts it would reach, counted when it started.
    /// </summary>
    [Nullable]
    [JsonPropertyName("recipients_estimated")]
    public long? RecipientsEstimated { get; set; }

    /// <summary>
    /// Why a paused broadcast waits: `paused` (by you), `billing_hold`, `budget_exceeded`, `usage_limit`, `marketing_paused`, `account_suspended`, `sending_paused`.
    /// </summary>
    [Nullable]
    [JsonPropertyName("pause_reason")]
    public string? PauseReason { get; set; }

    [Nullable]
    [JsonPropertyName("error")]
    public BroadcastError? Error { get; set; }

    [JsonPropertyName("stats")]
    public required BroadcastStats Stats { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required DateTime UpdatedAt { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
