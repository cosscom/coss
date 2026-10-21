using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Email;

[Serializable]
public record ListSuppressionsRequest
{
    /// <summary>
    /// Only entries for this address.
    /// </summary>
    [JsonIgnore]
    public string? Address { get; set; }

    /// <summary>
    /// Only entries with this scope.
    /// </summary>
    [JsonIgnore]
    public OneOf<
        ListSuppressionsRequestScopeZero,
        ListSuppressionsRequestScopeOne,
        string
    >? Scope { get; set; }

    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last entry of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
