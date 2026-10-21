using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ListAuditEventsRequest
{
    /// <summary>
    /// Only these actions, comma-separated. An entry ending in `.` matches every action of that resource: `domain.,api_key.created`.
    /// </summary>
    [JsonIgnore]
    public string? Action { get; set; }

    /// <summary>
    /// Only these actor types, e.g. `user,api_key`.
    /// </summary>
    [JsonIgnore]
    public string? ActorType { get; set; }

    /// <summary>
    /// Only changes made by this user or API key.
    /// </summary>
    [JsonIgnore]
    public string? ActorId { get; set; }

    /// <summary>
    /// Only changes to this resource, e.g. a `dom_…` id.
    /// </summary>
    [JsonIgnore]
    public string? TargetId { get; set; }

    /// <summary>
    /// Only changes in this environment.
    /// </summary>
    [JsonIgnore]
    public string? EnvironmentId { get; set; }

    /// <summary>
    /// Only events at or after this time.
    /// </summary>
    [JsonIgnore]
    public DateTime? From { get; set; }

    /// <summary>
    /// Only events before this time.
    /// </summary>
    [JsonIgnore]
    public DateTime? To { get; set; }

    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last event of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
