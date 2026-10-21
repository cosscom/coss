using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record CreateRiskListEntryRequest
{
    [JsonPropertyName("list")]
    public required RiskList List { get; set; }

    [JsonPropertyName("type")]
    public required RiskListEntryType Type { get; set; }

    [JsonPropertyName("value")]
    public required string Value { get; set; }

    [Optional]
    [JsonPropertyName("note")]
    public string? Note { get; set; }

    /// <summary>
    /// The entry stops matching at this time (it is kept until deleted).
    /// </summary>
    [Optional]
    [JsonPropertyName("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
