using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// What you sent in `checkout` (never the card).
/// </summary>
[Serializable]
public record RiskCheckoutSignals : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("amount")]
    public required long Amount { get; set; }

    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

    [JsonPropertyName("card_country")]
    public string? CardCountry { get; set; }

    [JsonPropertyName("card_funding")]
    public RiskCheckoutSignalsCardFunding? CardFunding { get; set; }

    [JsonPropertyName("billing_country")]
    public string? BillingCountry { get; set; }

    [JsonPropertyName("shipping_country")]
    public string? ShippingCountry { get; set; }

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
