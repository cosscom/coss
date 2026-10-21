using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email.Templates;

[Serializable]
public record ListVersionsRequest
{
    /// <summary>
    /// The template's id or alias.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// 1-20, default 10.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `version` of the last version of the previous page.
    /// </summary>
    [JsonIgnore]
    public long? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
