using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record CreateSignBuilderSessionRequest
{
    /// <summary>
    /// The template's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Seconds until the link expires: default 3600, at most 86400.
    /// </summary>
    [Optional]
    [JsonPropertyName("expires_in")]
    public int? ExpiresIn { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
