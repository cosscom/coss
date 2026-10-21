using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record DomainWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("organization_id")]
    public required string OrganizationId { get; set; }

    [JsonPropertyName("domain_id")]
    public required string DomainId { get; set; }

    [JsonPropertyName("domain")]
    public required string Domain { get; set; }

    [JsonPropertyName("dmarc_report_id")]
    public required string DmarcReportId { get; set; }

    /// <summary>
    /// The reporting organization (`org_name`).
    /// </summary>
    [JsonPropertyName("reporter")]
    public required string Reporter { get; set; }

    [JsonPropertyName("period_start")]
    public required DateTime PeriodStart { get; set; }

    [JsonPropertyName("period_end")]
    public required DateTime PeriodEnd { get; set; }

    [JsonPropertyName("messages")]
    public required long Messages { get; set; }

    [JsonPropertyName("passing")]
    public required long Passing { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

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
