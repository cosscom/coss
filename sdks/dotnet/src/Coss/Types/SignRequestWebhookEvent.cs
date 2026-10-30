using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignRequestWebhookEvent : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The event id: the same as the audit trail's `SignEvent.id`.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("object")]
    public required SignRequestWebhookEventObject Object { get; set; }

    [JsonPropertyName("type")]
    public required SignRequestWebhookEventType Type { get; set; }

    /// <summary>
    /// The API version the payload is rendered in (your endpoint's version).
    /// </summary>
    [JsonPropertyName("api_version")]
    public required string ApiVersion { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("data")]
    public required SignRequestWebhookEventData Data { get; set; }

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
