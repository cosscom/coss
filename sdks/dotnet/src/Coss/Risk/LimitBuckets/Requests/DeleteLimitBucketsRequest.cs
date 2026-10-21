using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record DeleteLimitBucketsRequest
{
    /// <summary>
    /// The bucket's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
