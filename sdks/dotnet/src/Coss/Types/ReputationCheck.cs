using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ReputationCheck : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// What was measured, e.g. `bounce_rate` or `complaint_rate`.
    /// </summary>
    [JsonPropertyName("trigger")]
    public required string Trigger { get; set; }

    /// <summary>
    /// `ok`, `warning` (at or above the warning threshold) or `suspend` (at or above the suspension threshold).
    /// </summary>
    [JsonPropertyName("severity")]
    public required ReputationCheckSeverity Severity { get; set; }

    [JsonPropertyName("message")]
    public required string Message { get; set; }

    /// <summary>
    /// `count / volume`; `null` with no volume.
    /// </summary>
    [Nullable]
    [JsonPropertyName("rate")]
    public double? Rate { get; set; }

    /// <summary>
    /// Matching recipients, e.g. permanent bounces.
    /// </summary>
    [JsonPropertyName("count")]
    public required long Count { get; set; }

    /// <summary>
    /// Recipients sent to (live environments) in the window.
    /// </summary>
    [JsonPropertyName("volume")]
    public required long Volume { get; set; }

    [Nullable]
    [JsonPropertyName("warning_threshold")]
    public double? WarningThreshold { get; set; }

    [Nullable]
    [JsonPropertyName("suspend_threshold")]
    public double? SuspendThreshold { get; set; }

    /// <summary>
    /// Below this volume the rate is reported but never acted on.
    /// </summary>
    [Nullable]
    [JsonPropertyName("minimum_volume")]
    public long? MinimumVolume { get; set; }

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
