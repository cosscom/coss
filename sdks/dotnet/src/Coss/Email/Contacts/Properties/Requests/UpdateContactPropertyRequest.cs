using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Email.Contacts;

[Serializable]
public record UpdateContactPropertyRequest
{
    /// <summary>
    /// The property's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [Nullable]
    [JsonPropertyName("fallback")]
    public OneOf<string, double, bool>? Fallback { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
