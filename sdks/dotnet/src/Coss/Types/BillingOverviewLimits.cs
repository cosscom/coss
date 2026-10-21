using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Resource limits (`null`: unlimited).
/// </summary>
[Serializable]
public record BillingOverviewLimits : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("domains")]
    public long? Domains { get; set; }

    [JsonPropertyName("members")]
    public long? Members { get; set; }

    [JsonPropertyName("webhook_endpoints_per_environment")]
    public long? WebhookEndpointsPerEnvironment { get; set; }

    [JsonPropertyName("contacts_per_environment")]
    public long? ContactsPerEnvironment { get; set; }

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
