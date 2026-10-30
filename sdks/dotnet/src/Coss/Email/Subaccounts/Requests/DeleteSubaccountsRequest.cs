using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record DeleteSubaccountsRequest
{
    /// <summary>
    /// The sub-account's `id` (`sub_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Subaccount { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
