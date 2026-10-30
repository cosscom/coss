using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record ListSubaccountsRequest
{
    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// The last `id` of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
