using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record InvoiceLine : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required InvoiceLineObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("kind")]
    public required InvoiceLineKind Kind { get; set; }

    [JsonPropertyName("description")]
    public required string Description { get; set; }

    /// <summary>
    /// What is counted, e.g. `email.recipients`.
    /// </summary>
    [JsonPropertyName("meter")]
    public InvoiceLineMeter? Meter { get; set; }

    [JsonPropertyName("dimension")]
    public string? Dimension { get; set; }

    [JsonPropertyName("quantity")]
    public long? Quantity { get; set; }

    /// <summary>
    /// Units covered by an allowance or committed volume (not charged).
    /// </summary>
    [JsonPropertyName("included_quantity")]
    public long? IncludedQuantity { get; set; }

    /// <summary>
    /// Dollars per unit, e.g. `0.0004`; `null` when the price varies by volume.
    /// </summary>
    [JsonPropertyName("unit_price")]
    public string? UnitPrice { get; set; }

    /// <summary>
    /// An amount in cents (USD).
    /// </summary>
    [JsonPropertyName("amount")]
    public required long Amount { get; set; }

    [JsonPropertyName("period")]
    public required InvoiceLinePeriod Period { get; set; }

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
