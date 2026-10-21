using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskReason : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("code")]
    public required RiskReasonCode Code { get; set; }

    [JsonPropertyName("message")]
    public required string Message { get; set; }

    /// <summary>
    /// The count behind a `velocity.*` reason, or the score behind a `content.*` one.
    /// </summary>
    [JsonPropertyName("value")]
    public double? Value { get; set; }

    /// <summary>
    /// What a `velocity.*` or `content.*` reason fires at.
    /// </summary>
    [JsonPropertyName("threshold")]
    public double? Threshold { get; set; }

    [JsonPropertyName("window")]
    public RiskReasonWindow? Window { get; set; }

    /// <summary>
    /// `email.typo`: the likely domain.
    /// </summary>
    [JsonPropertyName("suggestion")]
    public string? Suggestion { get; set; }

    /// <summary>
    /// `ip.hosting_provider`, `ip.vpn_network`: the network's operator; `ip.vpn`: the VPN service.
    /// </summary>
    [JsonPropertyName("provider")]
    public string? Provider { get; set; }

    /// <summary>
    /// `duplicate.canonical_mailbox`, `duplicate.device`: your id of the user who has the mailbox or device, if known.
    /// </summary>
    [JsonPropertyName("previous_user")]
    public string? PreviousUser { get; set; }

    /// <summary>
    /// `duplicate.canonical_mailbox`, `duplicate.device`: the assessment that first saw the mailbox or device.
    /// </summary>
    [JsonPropertyName("previous_assessment")]
    public string? PreviousAssessment { get; set; }

    /// <summary>
    /// `list.*`: the matching list entry.
    /// </summary>
    [JsonPropertyName("entry")]
    public string? Entry { get; set; }

    /// <summary>
    /// `rule.matched`: the rule's id.
    /// </summary>
    [JsonPropertyName("rule")]
    public string? Rule { get; set; }

    /// <summary>
    /// `rule.matched`: the rule's name.
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// `list.*`: what matched.
    /// </summary>
    [JsonPropertyName("type")]
    public RiskReasonType? Type { get; set; }

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
