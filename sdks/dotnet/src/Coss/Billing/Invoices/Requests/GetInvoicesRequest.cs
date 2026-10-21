using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Billing;

[Serializable]
public record GetInvoicesRequest
{
    /// <summary>
    /// The invoice's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
