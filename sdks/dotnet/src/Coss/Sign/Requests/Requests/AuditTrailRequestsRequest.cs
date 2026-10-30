using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record AuditTrailRequestsRequest
{
    /// <summary>
    /// The signature request's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
