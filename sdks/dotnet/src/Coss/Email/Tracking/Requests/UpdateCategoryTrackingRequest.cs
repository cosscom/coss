using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateCategoryTrackingRequest
{
    /// <summary>
    /// The category, as sent in `category`.
    /// </summary>
    [JsonIgnore]
    public required string Category { get; set; }

    [JsonIgnore]
    public required UpdateTrackingRuleRequest Body { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
