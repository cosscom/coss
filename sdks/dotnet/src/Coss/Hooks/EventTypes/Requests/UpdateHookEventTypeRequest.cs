using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record UpdateHookEventTypeRequest
{
    /// <summary>
    /// The event type's name.
    /// </summary>
    [JsonIgnore]
    public required string Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// A JSON Schema of the payload, shown to your users (not enforced).
    /// </summary>
    [JsonPropertyName("schema")]
    public Dictionary<string, object?>? Schema { get; set; }

    /// <summary>
    /// Up to 5 example payloads; the first is what a test send delivers.
    /// </summary>
    [JsonPropertyName("examples")]
    public IEnumerable<Dictionary<string, object?>>? Examples { get; set; }

    /// <summary>
    /// `false` restores an archived type.
    /// </summary>
    [JsonPropertyName("archived")]
    public bool? Archived { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
