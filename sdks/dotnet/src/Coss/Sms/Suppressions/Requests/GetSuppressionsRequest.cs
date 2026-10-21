using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sms_;

[Serializable]
public record GetSuppressionsRequest
{
    /// <summary>
    /// The entry's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
