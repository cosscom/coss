using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record DomainDmarcReportSummary : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("period_start")]
    public required DateTime PeriodStart { get; set; }

    [JsonPropertyName("period_end")]
    public required DateTime PeriodEnd { get; set; }

    [JsonPropertyName("reports")]
    public required long Reports { get; set; }

    [JsonPropertyName("messages")]
    public required long Messages { get; set; }

    [JsonPropertyName("passing")]
    public required long Passing { get; set; }

    [JsonPropertyName("coss_messages")]
    public required long CossMessages { get; set; }

    [JsonPropertyName("coss_passing")]
    public required long CossPassing { get; set; }

    [JsonPropertyName("first_report_at")]
    public DateTime? FirstReportAt { get; set; }

    [JsonPropertyName("last_report_at")]
    public DateTime? LastReportAt { get; set; }

    /// <summary>
    /// The 50 sources with the most messages in the period.
    /// </summary>
    [JsonPropertyName("sources")]
    public IEnumerable<DmarcSource> Sources { get; set; } = new List<DmarcSource>();

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
