using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UpdateLogDrainRequest
{
    /// <summary>
    /// The log drain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// An `https://` URL coss.com posts batches of log lines to.
    /// </summary>
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    /// <summary>
    /// A note for your own reference. `null` clears it.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// What the drain forwards: `api` (requests made with the environment's API keys), `email` (email events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from the organization's audit log). An empty array means every source, including ones added later.
    /// </summary>
    [JsonPropertyName("sources")]
    public IEnumerable<LogDrainSource>? Sources { get; set; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
