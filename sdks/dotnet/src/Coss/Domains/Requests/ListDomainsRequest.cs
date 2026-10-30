using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ListDomainsRequest
{
    /// <summary>
    /// Only this sub-account's domains (its id or your uid).
    /// </summary>
    [JsonIgnore]
    public string? Subaccount { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
