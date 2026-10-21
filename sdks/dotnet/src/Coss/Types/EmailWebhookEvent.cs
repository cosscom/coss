using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record EmailWebhookEvent : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The event id: the same as `EmailEvent.id`, and the `webhook-id` header.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("object")]
    public required EmailWebhookEventObject Object { get; set; }

    [JsonPropertyName("type")]
    public required EmailWebhookEventType Type { get; set; }

    /// <summary>
    /// The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.
    /// </summary>
    [JsonPropertyName("api_version")]
    public required string ApiVersion { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("data")]
    public required EmailWebhookEventData Data { get; set; }

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
