using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record CreateSignTemplateRequestFieldsItemAnchor : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// `signature` and `initials` take the signer's adopted signature, `date_signed` is filled with the signing date, `name` and `email` with the signer's, `text` and `checkbox` by the signer.
    /// </summary>
    [JsonPropertyName("type")]
    public required CreateSignTemplateRequestFieldsItemAnchorType Type { get; set; }

    /// <summary>
    /// Default `true`. A signer can't finish with a required field empty.
    /// </summary>
    [Optional]
    [JsonPropertyName("required")]
    public bool? Required { get; set; }

    /// <summary>
    /// Shown to the signer.
    /// </summary>
    [Optional]
    [JsonPropertyName("label")]
    public string? Label { get; set; }

    /// <summary>
    /// Place the field over every occurrence of this text in the documents (e.g. `{{signature:signer_1}}`).
    /// </summary>
    [JsonPropertyName("anchor")]
    public required string Anchor { get; set; }

    /// <summary>
    /// Default: the anchor text's width.
    /// </summary>
    [Optional]
    [JsonPropertyName("width")]
    public double? Width { get; set; }

    /// <summary>
    /// Default: the anchor text's height.
    /// </summary>
    [Optional]
    [JsonPropertyName("height")]
    public double? Height { get; set; }

    /// <summary>
    /// Points to move it right.
    /// </summary>
    [Optional]
    [JsonPropertyName("offset_x")]
    public double? OffsetX { get; set; }

    /// <summary>
    /// Points to move it down.
    /// </summary>
    [Optional]
    [JsonPropertyName("offset_y")]
    public double? OffsetY { get; set; }

    /// <summary>
    /// The role's key, e.g. `client`.
    /// </summary>
    [JsonPropertyName("role")]
    public required string Role { get; set; }

    /// <summary>
    /// `text` fields only: filled from the request's `merge_fields[merge_key]` (shown to the signer, not editable). Without a value, the signer fills it.
    /// </summary>
    [Optional]
    [JsonPropertyName("merge_key")]
    public string? MergeKey { get; set; }

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
