using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskPhoneCheckRequest
{
    /// <summary>
    /// The number in E.164 (`+14155550123`); spaces, dashes, dots and brackets are ignored. Anything else is `valid: false`.
    /// </summary>
    [JsonPropertyName("phone")]
    public required string Phone { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
