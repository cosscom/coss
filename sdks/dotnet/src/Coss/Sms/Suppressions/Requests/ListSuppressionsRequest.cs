using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sms_;

[Serializable]
public record ListSuppressionsRequest
{
    /// <summary>
    /// Only this number's entry.
    /// </summary>
    [JsonIgnore]
    public string? PhoneNumber { get; set; }

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
