using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record StatsSubaccountsRequest
{
    /// <summary>
    /// The sub-account's `id` (`sub_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Subaccount { get; set; }

    /// <summary>
    /// First day (UTC, `YYYY-MM-DD`); default 30 days before `to`.
    /// </summary>
    [JsonIgnore]
    public DateOnly? From { get; set; }

    /// <summary>
    /// Last day (UTC, `YYYY-MM-DD`), included; default today.
    /// </summary>
    [JsonIgnore]
    public DateOnly? To { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
