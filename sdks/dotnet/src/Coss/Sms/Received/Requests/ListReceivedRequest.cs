using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sms_;

[Serializable]
public record ListReceivedRequest
{
    /// <summary>
    /// Only messages from this number.
    /// </summary>
    [JsonIgnore]
    public string? From { get; set; }

    /// <summary>
    /// Only messages to this number of yours.
    /// </summary>
    [JsonIgnore]
    public string? To { get; set; }

    [JsonIgnore]
    public DateTime? CreatedAfter { get; set; }

    [JsonIgnore]
    public DateTime? CreatedBefore { get; set; }

    /// <summary>
    /// 1-100, default 20.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last item of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
