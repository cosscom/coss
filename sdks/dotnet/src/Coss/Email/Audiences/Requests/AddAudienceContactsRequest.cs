using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record AddAudienceContactsRequest
{
    /// <summary>
    /// The audience's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Contact ids or addresses of existing contacts.
    /// </summary>
    [JsonPropertyName("contacts")]
    public IEnumerable<string> Contacts { get; set; } = new List<string>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
