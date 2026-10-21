using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record RemoveContactAudiencesRequest
{
    /// <summary>
    /// The audience's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The contact's id, or its address (URL-encoded).
    /// </summary>
    [JsonIgnore]
    public required string ContactId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
