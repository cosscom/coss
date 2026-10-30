using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UpdateDomainRequest
{
    /// <summary>
    /// The domain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Let your sub-accounts send from this domain of yours (through your organization's reputation).
    /// </summary>
    [JsonPropertyName("shared_with_subaccounts")]
    public required bool SharedWithSubaccounts { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
