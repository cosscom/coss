using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// What your payment processor tells you about the card.
/// </summary>
[Serializable]
public record RiskCheckoutRequestCard : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Your payment processor's fingerprint of the card number (Stripe: `card.fingerprint`). Counted and remembered as a keyed hash only; never send the card number.
    /// </summary>
    [Optional]
    [JsonPropertyName("fingerprint")]
    public string? Fingerprint { get; set; }

    /// <summary>
    /// Where the card was issued.
    /// </summary>
    [Optional]
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [Optional]
    [JsonPropertyName("funding")]
    public RiskCheckoutRequestCardFunding? Funding { get; set; }

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
