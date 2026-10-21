using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Only with `checkout` events: what is being paid for, and with which card.
/// </summary>
[Serializable]
public record RiskCheckoutRequest : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The amount in the currency's minor unit (cents for USD: 1999 is $19.99).
    /// </summary>
    [JsonPropertyName("amount")]
    public required long Amount { get; set; }

    /// <summary>
    /// ISO 4217, upper-case (`USD`).
    /// </summary>
    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

    /// <summary>
    /// What your payment processor tells you about the card.
    /// </summary>
    [Optional]
    [JsonPropertyName("card")]
    public RiskCheckoutRequestCard? Card { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2, upper-case (`GB`).
    /// </summary>
    [Optional]
    [JsonPropertyName("billing_country")]
    public string? BillingCountry { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2, upper-case (`GB`).
    /// </summary>
    [Optional]
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
