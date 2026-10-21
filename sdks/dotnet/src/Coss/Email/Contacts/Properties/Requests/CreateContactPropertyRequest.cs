using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Email.Contacts;

[Serializable]
public record CreateContactPropertyRequest
{
    [JsonPropertyName("key")]
    public required string Key { get; set; }

    [JsonPropertyName("type")]
    public required CreateContactPropertyRequestType Type { get; set; }

    [JsonPropertyName("fallback")]
    public OneOf<string, double, bool>? Fallback { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
