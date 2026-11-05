using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record ListOutOfOfficeRequest
{
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// The last id of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <summary>
    /// One host's entries, by id or uid.
    /// </summary>
    [JsonIgnore]
    public string? Host { get; set; }

    /// <summary>
    /// Entries ending after this.
    /// </summary>
    [JsonIgnore]
    public string? StartAfter { get; set; }

    /// <summary>
    /// Entries starting before this.
    /// </summary>
    [JsonIgnore]
    public string? StartBefore { get; set; }

    /// <summary>
    /// The entries one request made.
    /// </summary>
    [JsonIgnore]
    public string? Group { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
