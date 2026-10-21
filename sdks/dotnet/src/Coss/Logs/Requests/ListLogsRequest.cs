using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ListLogsRequest
{
    /// <summary>
    /// Start of the range (inclusive). Defaults to an hour before `to`.
    /// </summary>
    [JsonIgnore]
    public DateTime? From { get; set; }

    /// <summary>
    /// End of the range (exclusive). Defaults to now. At most 31 days.
    /// </summary>
    [JsonIgnore]
    public DateTime? To { get; set; }

    /// <summary>
    /// Only these sources, comma-separated: `api,email,webhook`.
    /// </summary>
    [JsonIgnore]
    public string? Source { get; set; }

    /// <summary>
    /// Only these levels, comma-separated: `warning,error`.
    /// </summary>
    [JsonIgnore]
    public string? Level { get; set; }

    /// <summary>
    /// Only these types, e.g. `email.bounced,email.complained`.
    /// </summary>
    [JsonIgnore]
    public string? Type { get; set; }

    /// <summary>
    /// Only these status codes or classes, e.g. `4xx,503`.
    /// </summary>
    [JsonIgnore]
    public string? Status { get; set; }

    /// <summary>
    /// Only these HTTP methods, e.g. `POST`.
    /// </summary>
    [JsonIgnore]
    public string? Method { get; set; }

    /// <summary>
    /// Only these routes, e.g. `/v1/emails/:id`.
    /// </summary>
    [JsonIgnore]
    public string? Route { get; set; }

    /// <summary>
    /// Only requests made with these API keys.
    /// </summary>
    [JsonIgnore]
    public string? ApiKeyId { get; set; }

    /// <summary>
    /// Only this request's lines.
    /// </summary>
    [JsonIgnore]
    public string? RequestId { get; set; }

    /// <summary>
    /// Only lines about this resource, e.g. an `email_…` id.
    /// </summary>
    [JsonIgnore]
    public string? ResourceId { get; set; }

    /// <summary>
    /// Free text, matched against the message, path, ids and recipient.
    /// </summary>
    [JsonIgnore]
    public string? Q { get; set; }

    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last line of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
