using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// What the receiving server concluded: `pass`, `fail`, `gray` (could not decide) or `processing_failed`; `null` when the check did not run.
/// </summary>
[Serializable]
public record ReceivedEmailVerdicts : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("spam")]
    public ReceivedEmailVerdictsSpam? Spam { get; set; }

    [JsonPropertyName("virus")]
    public ReceivedEmailVerdictsVirus? Virus { get; set; }

    [JsonPropertyName("spf")]
    public ReceivedEmailVerdictsSpf? Spf { get; set; }

    [JsonPropertyName("dkim")]
    public ReceivedEmailVerdictsDkim? Dkim { get; set; }

    [JsonPropertyName("dmarc")]
    public ReceivedEmailVerdictsDmarc? Dmarc { get; set; }

    /// <summary>
    /// The sender domain's DMARC policy (`none`, `quarantine` or `reject`) when DMARC failed.
    /// </summary>
    [JsonPropertyName("dmarc_policy")]
    public string? DmarcPolicy { get; set; }

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
