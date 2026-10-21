using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskEmailCheckRequest
{
    /// <summary>
    /// The address to check, as given.
    /// </summary>
    [JsonPropertyName("email")]
    public required string Email { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
