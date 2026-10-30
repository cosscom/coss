using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskPhoneSimSwap : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The SIM changed within `period`: someone may have taken the number over.
    /// </summary>
    [JsonPropertyName("recent")]
    public required bool Recent { get; set; }

    /// <summary>
    /// The last SIM change, where the carrier tells the date.
    /// </summary>
    [Nullable]
    [JsonPropertyName("swapped_at")]
    public string? SwappedAt { get; set; }

    /// <summary>
    /// What `recent` means, as an ISO 8601 duration (`PT48H`).
    /// </summary>
    [Nullable]
    [JsonPropertyName("period")]
    public string? Period { get; set; }

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
