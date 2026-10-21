using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.LogDrains;

[Serializable]
public record GetBatchesRequest
{
    /// <summary>
    /// The log drain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The batch's id.
    /// </summary>
    [JsonIgnore]
    public required string BatchId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
