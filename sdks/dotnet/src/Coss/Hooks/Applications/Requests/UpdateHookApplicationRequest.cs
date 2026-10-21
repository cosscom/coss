using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record UpdateHookApplicationRequest
{
    /// <summary>
    /// The application's `id` (`happ_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Application { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// `null` removes it.
    /// </summary>
    [JsonPropertyName("uid")]
    public string? Uid { get; set; }

    /// <summary>
    /// Replaces the metadata.
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
