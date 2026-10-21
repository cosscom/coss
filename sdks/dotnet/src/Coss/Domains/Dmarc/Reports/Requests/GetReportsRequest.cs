using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Domains.Dmarc;

[Serializable]
public record GetReportsRequest
{
    /// <summary>
    /// The domain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The report's id.
    /// </summary>
    [JsonIgnore]
    public required string ReportId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
