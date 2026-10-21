using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record CreatePreferenceLinksRequest
{
    /// <summary>
    /// The contact's id, or its address (URL-encoded).
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The topic your email is about: its unsubscribe link leaves just that topic.
    /// </summary>
    [Optional]
    [JsonPropertyName("topic")]
    public string? Topic { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
