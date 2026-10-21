using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Email;

[Serializable]
public record CreateSuppressionRequest
{
    /// <summary>
    /// The address to suppress. Display names are ignored; matching is case-insensitive.
    /// </summary>
    [JsonPropertyName("address")]
    public required string Address { get; set; }

    /// <summary>
    /// Defaults to `*` (every email). Pass a category, e.g. "marketing", to only skip those.
    /// </summary>
    [Optional]
    [JsonPropertyName("scope")]
    public OneOf<
        CreateSuppressionRequestScopeZero,
        CreateSuppressionRequestScopeOne,
        string
    >? Scope { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
