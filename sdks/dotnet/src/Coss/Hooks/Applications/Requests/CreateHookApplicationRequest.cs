using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record CreateHookApplicationRequest
{
    /// <summary>
    /// Shown to the application's users in the portal.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Your own id for it, to address it by in every path instead of its `id`.
    /// </summary>
    [Optional]
    [JsonPropertyName("uid")]
    public string? Uid { get; set; }

    /// <summary>
    /// Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
    /// </summary>
    [Optional]
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
