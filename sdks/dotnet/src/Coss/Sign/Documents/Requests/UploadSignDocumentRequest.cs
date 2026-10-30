using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record UploadSignDocumentRequest
{
    /// <summary>
    /// The file's name, ending in `.pdf`.
    /// </summary>
    [JsonPropertyName("filename")]
    public required string Filename { get; set; }

    /// <summary>
    /// The PDF's bytes, base64-encoded (at most 25 MB decoded).
    /// </summary>
    [JsonPropertyName("content")]
    public required string Content { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
