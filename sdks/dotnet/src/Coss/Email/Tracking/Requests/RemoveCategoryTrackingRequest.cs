using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record RemoveCategoryTrackingRequest
{
    /// <summary>
    /// The category, as sent in `category`.
    /// </summary>
    [JsonIgnore]
    public required string Category { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
