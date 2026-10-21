using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// This month so far, as it would be invoiced if it ended now.
/// </summary>
[Serializable]
public record BillingOverviewEstimate : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Usage this month at your rates.
    /// </summary>
    [JsonPropertyName("usage")]
    public required long Usage { get; set; }

    /// <summary>
    /// An amount in cents (USD).
    /// </summary>
    [JsonPropertyName("discount")]
    public required long Discount { get; set; }

    /// <summary>
    /// Credit applied to this estimate (your plan's fee is credit).
    /// </summary>
    [JsonPropertyName("credit")]
    public required long Credit { get; set; }

    /// <summary>
    /// Estimated total including usage and fees billed in arrears, after discounts and credits.
    /// </summary>
    [JsonPropertyName("total")]
    public required long Total { get; set; }

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
