using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record BroadcastStats : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Emails made so far (one per reached contact).
    /// </summary>
    [JsonPropertyName("recipients")]
    public required long Recipients { get; set; }

    [JsonPropertyName("sent")]
    public required long Sent { get; set; }

    [JsonPropertyName("delivered")]
    public required long Delivered { get; set; }

    /// <summary>
    /// Permanent bounces.
    /// </summary>
    [JsonPropertyName("bounced")]
    public required long Bounced { get; set; }

    [JsonPropertyName("complained")]
    public required long Complained { get; set; }

    [JsonPropertyName("failed")]
    public required long Failed { get; set; }

    /// <summary>
    /// Emails opened at least once (with open tracking).
    /// </summary>
    [JsonPropertyName("opened")]
    public required long Opened { get; set; }

    /// <summary>
    /// Emails clicked at least once (with click tracking).
    /// </summary>
    [JsonPropertyName("clicked")]
    public required long Clicked { get; set; }

    /// <summary>
    /// Unsubscribes through the broadcast's links.
    /// </summary>
    [JsonPropertyName("unsubscribed")]
    public required long Unsubscribed { get; set; }

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
