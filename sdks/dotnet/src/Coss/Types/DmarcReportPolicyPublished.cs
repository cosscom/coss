using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// The policy the reporter found when it evaluated the mail.
/// </summary>
[Serializable]
public record DmarcReportPolicyPublished : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("domain")]
    public required string Domain { get; set; }

    [JsonPropertyName("p")]
    public string? P { get; set; }

    [JsonPropertyName("sp")]
    public string? Sp { get; set; }

    [JsonPropertyName("np")]
    public string? Np { get; set; }

    [JsonPropertyName("adkim")]
    public string? Adkim { get; set; }

    [JsonPropertyName("aspf")]
    public string? Aspf { get; set; }

    [JsonPropertyName("pct")]
    public long? Pct { get; set; }

    [JsonPropertyName("testing")]
    public string? Testing { get; set; }

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
