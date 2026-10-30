using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskPhoneCarrier : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [Nullable]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [Nullable]
    [JsonPropertyName("mobile_country_code")]
    public string? MobileCountryCode { get; set; }

    /// <summary>
    /// Only for mobile numbers.
    /// </summary>
    [Nullable]
    [JsonPropertyName("mobile_network_code")]
    public string? MobileNetworkCode { get; set; }

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
