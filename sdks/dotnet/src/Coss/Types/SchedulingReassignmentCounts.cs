using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentCounts : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("total")]
    public required double Total { get; set; }

    [JsonPropertyName("pending")]
    public required double Pending { get; set; }

    [JsonPropertyName("reassigned")]
    public required double Reassigned { get; set; }

    /// <summary>
    /// They'd moved on since it was selected.
    /// </summary>
    [JsonPropertyName("skipped")]
    public required double Skipped { get; set; }

    /// <summary>
    /// Nobody could take them: they stayed.
    /// </summary>
    [JsonPropertyName("no_candidate")]
    public required double NoCandidate { get; set; }

    [JsonPropertyName("failed")]
    public required double Failed { get; set; }

    [JsonPropertyName("cancelled")]
    public required double Cancelled { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
