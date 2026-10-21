using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Only for `email.rescheduled`.
/// </summary>
[Serializable]
public record EmailEventDataReschedule : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The new time.
    /// </summary>
    [JsonPropertyName("scheduled_at")]
    public required DateTime ScheduledAt { get; set; }

    /// <summary>
    /// The time it replaced.
    /// </summary>
    [JsonPropertyName("previous_scheduled_at")]
    public required DateTime PreviousScheduledAt { get; set; }

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
