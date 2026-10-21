using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record GetBatchEmailRequest
{
    /// <summary>
    /// The batch's id (`batch_id` of its emails).
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
