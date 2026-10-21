using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record ExportContactsRequest
{
    [JsonIgnore]
    public ExportContactsRequestStatus? Status { get; set; }

    /// <summary>
    /// Only members of this audience.
    /// </summary>
    [JsonIgnore]
    public string? AudienceId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
