using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// The result of the last BIMI check: whether mailbox providers can find the domain's brand logo and certificate. The record and the certificate are your own.
/// </summary>
[Serializable]
public record DomainBimi : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// `configured` when the BIMI record is valid and DMARC is enforced, `invalid` when a record exists but something is wrong (see `issues`), `missing` when there is no record, and `not_checked` until DNS has been consulted. coss.com checks DNS only: mailbox providers still validate the logo and the certificate.
    /// </summary>
    [JsonPropertyName("status")]
    public required DomainBimiStatus Status { get; set; }

    /// <summary>
    /// Where the BIMI record was found, or looked up when there is none: `default._bimi.&lt;domain&gt;`, or the organizational domain's when only it has one.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// The `v=BIMI1` record found.
    /// </summary>
    [JsonPropertyName("record")]
    public string? Record { get; set; }

    /// <summary>
    /// The record's logo URL (`l=`).
    /// </summary>
    [JsonPropertyName("logo_url")]
    public string? LogoUrl { get; set; }

    /// <summary>
    /// The record's VMC or CMC certificate URL (`a=`).
    /// </summary>
    [JsonPropertyName("certificate_url")]
    public string? CertificateUrl { get; set; }

    /// <summary>
    /// The DMARC policy that applies to the domain (the organizational domain's `sp` when it has no record of its own), `null` without a DMARC record.
    /// </summary>
    [JsonPropertyName("dmarc_policy")]
    public DomainBimiDmarcPolicy? DmarcPolicy { get; set; }

    /// <summary>
    /// What keeps the domain's logo from showing, as far as DNS tells.
    /// </summary>
    [JsonPropertyName("issues")]
    public IEnumerable<DomainBimiIssuesItem> Issues { get; set; } =
        new List<DomainBimiIssuesItem>();

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
