using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// The contract in effect; `null` on the Free plan.
/// </summary>
[Serializable]
public record BillingOverviewContract : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("kind")]
    public required BillingOverviewContractKind Kind { get; set; }

    [JsonPropertyName("effective_from")]
    public required DateTime EffectiveFrom { get; set; }

    [Nullable]
    [JsonPropertyName("effective_until")]
    public DateTime? EffectiveUntil { get; set; }

    /// <summary>
    /// End of a committed term.
    /// </summary>
    [Nullable]
    [JsonPropertyName("term_end")]
    public DateTime? TermEnd { get; set; }

    [JsonPropertyName("auto_renew")]
    public required bool AutoRenew { get; set; }

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
