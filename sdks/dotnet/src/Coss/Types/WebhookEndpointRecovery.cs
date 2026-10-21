using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record WebhookEndpointRecovery : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required WebhookEndpointRecoveryObject Object { get; set; }

    [JsonPropertyName("endpoint_id")]
    public required string EndpointId { get; set; }

    /// <summary>
    /// How many failed deliveries were queued for one more attempt. Their attempts are spread over the next minute.
    /// </summary>
    [JsonPropertyName("requeued")]
    public required long Requeued { get; set; }

    /// <summary>
    /// At most 1,000 are requeued per call; `true` means call again with the same `since`.
    /// </summary>
    [JsonPropertyName("has_more")]
    public required bool HasMore { get; set; }

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
