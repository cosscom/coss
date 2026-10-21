using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record EmailRecipient : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The bare, lower-cased address.
    /// </summary>
    [JsonPropertyName("address")]
    public required string Address { get; set; }

    [JsonPropertyName("type")]
    public required EmailRecipientType Type { get; set; }

    /// <summary>
    /// Delivery status of this recipient. `suppressed` means the address is on the environment's suppression list (for every email or for this email's category), so it was skipped. `canceled` means the scheduled email was canceled before it was sent.
    /// </summary>
    [JsonPropertyName("status")]
    public required EmailRecipientStatus Status { get; set; }

    [Nullable]
    [JsonPropertyName("last_event_at")]
    public DateTime? LastEventAt { get; set; }

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
