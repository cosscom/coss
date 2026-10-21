using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record WebhookListenerPoll : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required WebhookListenerPollObject Object { get; set; }

    [JsonPropertyName("listener")]
    public required WebhookListener Listener { get; set; }

    /// <summary>
    /// Events to forward, oldest first. Empty when none arrived while the poll waited. A delivery not acknowledged within two minutes is handed out again.
    /// </summary>
    [JsonPropertyName("deliveries")]
    public IEnumerable<WebhookListenerDelivery> Deliveries { get; set; } =
        new List<WebhookListenerDelivery>();

    /// <summary>
    /// How many of the request's acknowledgements were recorded.
    /// </summary>
    [JsonPropertyName("acknowledged")]
    public required long Acknowledged { get; set; }

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
