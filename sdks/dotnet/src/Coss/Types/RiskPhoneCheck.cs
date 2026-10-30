using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskPhoneCheck : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required RiskPhoneCheckObject Object { get; set; }

    /// <summary>
    /// The number in E.164, or as given when it isn't.
    /// </summary>
    [JsonPropertyName("phone")]
    public required string Phone { get; set; }

    /// <summary>
    /// A possible number in its country's numbering plan. When the lookup failed (`degraded`), only the E.164 syntax was checked.
    /// </summary>
    [JsonPropertyName("valid")]
    public required bool Valid { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2.
    /// </summary>
    [Nullable]
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    /// <summary>
    /// `fixed_voip` numbers belong to an address (cable, business lines); `non_fixed_voip` ones can be had online in minutes (Google Voice, app numbers), the kind used for throwaway accounts. `null` when it couldn't be looked up.
    /// </summary>
    [Nullable]
    [JsonPropertyName("line_type")]
    public RiskPhoneCheckLineType? LineType { get; set; }

    /// <summary>
    /// The network the number is on now (after any port). `null` when unknown, and for toll-free, premium and personal numbers.
    /// </summary>
    [Nullable]
    [JsonPropertyName("carrier")]
    public RiskPhoneCarrier? Carrier { get; set; }

    /// <summary>
    /// The mobile number's last SIM change. `null` where coss.com doesn't have that data (not every country and carrier).
    /// </summary>
    [Nullable]
    [JsonPropertyName("sim_swap")]
    public RiskPhoneSimSwap? SimSwap { get; set; }

    /// <summary>
    /// `phone_data` when the lookup failed or timed out (or had no line type for the number); `sim_swap` when the carrier didn't answer about the SIM.
    /// </summary>
    [JsonPropertyName("degraded")]
    public IEnumerable<RiskPhoneCheckDegradedItem> Degraded { get; set; } =
        new List<RiskPhoneCheckDegradedItem>();

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
