using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskIpSignals : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("version")]
    public required double Version { get; set; }

    [JsonPropertyName("private")]
    public required bool Private { get; set; }

    [JsonPropertyName("tor")]
    public required bool Tor { get; set; }

    [JsonPropertyName("hosting")]
    public required bool Hosting { get; set; }

    [JsonPropertyName("hosting_provider")]
    public string? HostingProvider { get; set; }

    [JsonPropertyName("hosting_kind")]
    public RiskIpSignalsHostingKind? HostingKind { get; set; }

    [JsonPropertyName("asn")]
    public long? Asn { get; set; }

    [JsonPropertyName("as_name")]
    public string? AsName { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2.
    /// </summary>
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    /// <summary>
    /// From coss.com's IP privacy data provider (VPNs, proxies, relays). `null` when it isn't available or was not asked (private addresses).
    /// </summary>
    [JsonPropertyName("privacy")]
    public RiskIpPrivacy? Privacy { get; set; }

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
