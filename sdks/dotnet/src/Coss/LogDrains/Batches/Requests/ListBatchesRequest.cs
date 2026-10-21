using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.LogDrains;

[Serializable]
public record ListBatchesRequest
{
    /// <summary>
    /// The log drain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Only batches with this status.
    /// </summary>
    [JsonIgnore]
    public ListBatchesRequestStatus? Status { get; set; }

    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last batch of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
