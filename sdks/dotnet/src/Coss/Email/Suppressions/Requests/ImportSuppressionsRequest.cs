using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record ImportSuppressionsRequest
{
    /// <summary>
    /// Import into a sub-account's own list (its id or your uid) instead of the environment's.
    /// </summary>
    [Optional]
    [JsonPropertyName("subaccount")]
    public string? Subaccount { get; set; }

    /// <summary>
    /// 1-1000 entries. Each one is validated on its own: invalid entries are skipped and reported in `invalid`, the rest are imported.
    /// </summary>
    [JsonPropertyName("suppressions")]
    public IEnumerable<ImportSuppressionsRequestSuppressionsItem> Suppressions { get; set; } =
        new List<ImportSuppressionsRequestSuppressionsItem>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
