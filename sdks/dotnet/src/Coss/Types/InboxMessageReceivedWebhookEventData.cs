using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record InboxMessageReceivedWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("inbox_id")]
    public required string InboxId { get; set; }

    [JsonPropertyName("inbox_address")]
    public required string InboxAddress { get; set; }

    [JsonPropertyName("thread_id")]
    public required string ThreadId { get; set; }

    /// <summary>
    /// The inbox message's id (`imsg_…`).
    /// </summary>
    [JsonPropertyName("message_id")]
    public required string MessageId { get; set; }

    [JsonPropertyName("received_email_id")]
    public required string ReceivedEmailId { get; set; }

    [Nullable]
    [JsonPropertyName("from")]
    public string? From { get; set; }

    [JsonPropertyName("to")]
    public IEnumerable<string> To { get; set; } = new List<string>();

    [Nullable]
    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    [JsonPropertyName("attachment_count")]
    public required long AttachmentCount { get; set; }

    /// <summary>
    /// Whether the message started its thread.
    /// </summary>
    [JsonPropertyName("new_thread")]
    public required bool NewThread { get; set; }

    [JsonPropertyName("spam")]
    public required bool Spam { get; set; }

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("received_at")]
    public required DateTime ReceivedAt { get; set; }

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
