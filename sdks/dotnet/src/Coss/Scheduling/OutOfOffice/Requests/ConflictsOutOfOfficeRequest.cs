using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record ConflictsOutOfOfficeRequest
{
    /// <summary>
    /// The entry's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [JsonIgnore]
    public int? Limit { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
