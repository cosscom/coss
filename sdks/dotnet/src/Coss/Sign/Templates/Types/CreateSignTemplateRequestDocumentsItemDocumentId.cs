using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record CreateSignTemplateRequestDocumentsItemDocumentId : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// An uploaded document.
    /// </summary>
    [JsonPropertyName("document_id")]
    public required string DocumentId { get; set; }

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
