using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskContentClassifyRequest
{
    /// <summary>
    /// The text to classify (a profile bio, a comment, a listing). The model reads the first 8,000 characters.
    /// </summary>
    [JsonPropertyName("text")]
    public required string Text { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
