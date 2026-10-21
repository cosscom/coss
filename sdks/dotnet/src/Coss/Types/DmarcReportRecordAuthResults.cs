using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record DmarcReportRecordAuthResults : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("dkim")]
    public IEnumerable<DmarcReportRecordAuthResultsDkimItem> Dkim { get; set; } =
        new List<DmarcReportRecordAuthResultsDkimItem>();

    [JsonPropertyName("spf")]
    public IEnumerable<DmarcReportRecordAuthResultsSpfItem> Spf { get; set; } =
        new List<DmarcReportRecordAuthResultsSpfItem>();

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
