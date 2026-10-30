using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ListVerifyRequest
{
    /// <summary>
    /// Only verifications to this destination.
    /// </summary>
    [JsonIgnore]
    public string? To { get; set; }

    /// <summary>
    /// Only verifications in this status.
    /// </summary>
    [JsonIgnore]
    public ListVerifyRequestStatus? Status { get; set; }

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
