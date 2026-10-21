using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateAudienceRequest
{
    /// <summary>
    /// The audience's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
