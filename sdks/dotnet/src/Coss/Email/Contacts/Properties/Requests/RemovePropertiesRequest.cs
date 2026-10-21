using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email.Contacts;

[Serializable]
public record RemovePropertiesRequest
{
    /// <summary>
    /// The property's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
