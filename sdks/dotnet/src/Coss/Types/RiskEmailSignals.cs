using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskEmailSignals : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// `null` once the address is removed (90 days after the assessment).
    /// </summary>
    [JsonPropertyName("domain")]
    public string? Domain { get; set; }

    [JsonPropertyName("valid")]
    public required bool Valid { get; set; }

    [JsonPropertyName("disposable")]
    public required bool Disposable { get; set; }

    /// <summary>
    /// From DNS (MX, A, AAAA). `unknown` when the lookup failed or timed out.
    /// </summary>
    [JsonPropertyName("deliverability")]
    public required RiskEmailSignalsDeliverability Deliverability { get; set; }

    [JsonPropertyName("role_account")]
    public required bool RoleAccount { get; set; }

    [JsonPropertyName("free_provider")]
    public required bool FreeProvider { get; set; }

    [JsonPropertyName("suggestion")]
    public string? Suggestion { get; set; }

    /// <summary>
    /// Days since the domain was registered (RDAP); `null` when unknown or not looked up (free providers, disposable domains).
    /// </summary>
    [JsonPropertyName("domain_age_days")]
    public long? DomainAgeDays { get; set; }

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
