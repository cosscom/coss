using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Scheduling;

[Serializable]
public record CreateSchedulingManagerSessionRequest
{
    /// <summary>
    /// The hosts this page can reach, by id or uid.
    /// </summary>
    [Optional]
    [JsonPropertyName("hosts")]
    public IEnumerable<string>? Hosts { get; set; }

    /// <summary>
    /// Everyone matching these attributes, asked again on every request.
    /// </summary>
    [Optional]
    [JsonPropertyName("host_filter")]
    public Dictionary<string, OneOf<string, IEnumerable<string>>>? HostFilter { get; set; }

    /// <summary>
    /// Seconds until it stops working. At most a day.
    /// </summary>
    [Optional]
    [JsonPropertyName("expires_in")]
    public int? ExpiresIn { get; set; }

    [Optional]
    [JsonPropertyName("read_only")]
    public bool? ReadOnly { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
