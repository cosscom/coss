using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record TestBroadcastRequest
{
    /// <summary>
    /// The broadcast's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [JsonPropertyName("to")]
    public IEnumerable<string> To { get; set; } = new List<string>();

    /// <summary>
    /// A contact (id or address) whose values fill the template; default: fallbacks.
    /// </summary>
    [Optional]
    [JsonPropertyName("contact")]
    public string? Contact { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
