using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ContactWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("contact")]
    public required ContactWebhookEventDataContact Contact { get; set; }

    [JsonPropertyName("source")]
    public required ContactWebhookEventDataSource Source { get; set; }

    /// <summary>
    /// `contact.unsubscribed` from one topic (its key); `null`: from marketing altogether.
    /// </summary>
    [Nullable]
    [JsonPropertyName("topic")]
    public string? Topic { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

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
