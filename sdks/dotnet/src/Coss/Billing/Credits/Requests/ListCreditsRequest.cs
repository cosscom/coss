using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Billing;

[Serializable]
public record ListCreditsRequest
{
    /// <summary>
    /// `active` (default): usable now or later, with something left; `all`: every credit, newest first.
    /// </summary>
    [JsonIgnore]
    public ListCreditsRequestStatus? Status { get; set; }

    /// <summary>
    /// Continue after this id (the last of the previous page).
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <summary>
    /// At most this many (default 20).
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
