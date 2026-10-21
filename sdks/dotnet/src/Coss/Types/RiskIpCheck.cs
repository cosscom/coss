using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskIpCheck : IJsonOnDeserialized
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

    [Nullable]
    [JsonPropertyName("hosting_provider")]
    public string? HostingProvider { get; set; }

    [Nullable]
    [JsonPropertyName("hosting_kind")]
    public RiskIpCheckHostingKind? HostingKind { get; set; }

    [Nullable]
    [JsonPropertyName("asn")]
    public long? Asn { get; set; }

    [Nullable]
    [JsonPropertyName("as_name")]
    public string? AsName { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2.
    /// </summary>
    [Nullable]
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    /// <summary>
    /// From coss.com's IP privacy data provider (VPNs, proxies, relays). `null` when it isn't available or was not asked (private addresses).
    /// </summary>
    [Nullable]
    [JsonPropertyName("privacy")]
    public RiskIpPrivacy? Privacy { get; set; }

    [JsonPropertyName("object")]
    public required RiskIpCheckObject Object { get; set; }

    [JsonPropertyName("ip")]
    public required string Ip { get; set; }

    /// <summary>
    /// `ip_data` when some IP data (Tor exits, cloud ranges, networks and countries) is unavailable at the moment; `ip_privacy` when the privacy data provider failed or timed out.
    /// </summary>
    [JsonPropertyName("degraded")]
    public IEnumerable<RiskIpCheckDegradedItem> Degraded { get; set; } =
        new List<RiskIpCheckDegradedItem>();

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
