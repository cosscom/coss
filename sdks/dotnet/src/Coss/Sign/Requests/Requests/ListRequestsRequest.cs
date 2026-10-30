using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record ListRequestsRequest
{
    /// <summary>
    /// Only requests in these statuses, comma-separated: `sent,draft`.
    /// </summary>
    [JsonIgnore]
    public string? Status { get; set; }

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
