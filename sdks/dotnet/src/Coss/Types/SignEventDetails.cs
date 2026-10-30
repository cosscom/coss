using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignEventDetails : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [Optional]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    /// <summary>
    /// Each document's SHA-256 at that moment, by document id.
    /// </summary>
    [Optional]
    [JsonPropertyName("document_sha256")]
    public Dictionary<string, string>? DocumentSha256 { get; set; }

    /// <summary>
    /// SHA-256 of the consent text the signer accepted.
    /// </summary>
    [Optional]
    [JsonPropertyName("disclosure_sha256")]
    public string? DisclosureSha256 { get; set; }

    [Optional]
    [JsonPropertyName("field_ids")]
    public IEnumerable<string>? FieldIds { get; set; }

    /// <summary>
    /// SHA-256 of the signature image the signer adopted.
    /// </summary>
    [Optional]
    [JsonPropertyName("signature_sha256")]
    public string? SignatureSha256 { get; set; }

    [Optional]
    [JsonPropertyName("initials_sha256")]
    public string? InitialsSha256 { get; set; }

    /// <summary>
    /// The signing session the signer used.
    /// </summary>
    [Optional]
    [JsonPropertyName("session_id")]
    public string? SessionId { get; set; }

    /// <summary>
    /// `sealed`: the SHA-256 of the sealed, completed document.
    /// </summary>
    [Optional]
    [JsonPropertyName("signed_document_sha256")]
    public string? SignedDocumentSha256 { get; set; }

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
