using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record BillingOverviewFeatures : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("tracking_domains")]
    public required bool TrackingDomains { get; set; }

    [JsonPropertyName("audit_log")]
    public required bool AuditLog { get; set; }

    [JsonPropertyName("log_drains")]
    public required bool LogDrains { get; set; }

    [JsonPropertyName("sso")]
    public required bool Sso { get; set; }

    [JsonPropertyName("scim")]
    public required bool Scim { get; set; }

    [JsonPropertyName("dedicated_ips")]
    public required bool DedicatedIps { get; set; }

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
