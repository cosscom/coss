using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record DmarcReportRecord : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("source_ip")]
    public required string SourceIp { get; set; }

    [JsonPropertyName("count")]
    public required long Count { get; set; }

    /// <summary>
    /// What the receiver did with the messages.
    /// </summary>
    [JsonPropertyName("disposition")]
    public required DmarcReportRecordDisposition Disposition { get; set; }

    /// <summary>
    /// Aligned DKIM result.
    /// </summary>
    [JsonPropertyName("dkim")]
    public required DmarcReportRecordDkim Dkim { get; set; }

    /// <summary>
    /// Aligned SPF result.
    /// </summary>
    [JsonPropertyName("spf")]
    public required DmarcReportRecordSpf Spf { get; set; }

    [JsonPropertyName("dmarc_pass")]
    public required bool DmarcPass { get; set; }

    [JsonPropertyName("header_from")]
    public required string HeaderFrom { get; set; }

    [Nullable]
    [JsonPropertyName("envelope_from")]
    public string? EnvelopeFrom { get; set; }

    [JsonPropertyName("via_coss")]
    public required bool ViaCoss { get; set; }

    [JsonPropertyName("auth_results")]
    public required DmarcReportRecordAuthResults AuthResults { get; set; }

    [JsonPropertyName("reasons")]
    public IEnumerable<DmarcReportRecordReasonsItem> Reasons { get; set; } =
        new List<DmarcReportRecordReasonsItem>();

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
