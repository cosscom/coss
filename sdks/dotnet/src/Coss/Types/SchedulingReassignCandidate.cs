using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignCandidate : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingReassignCandidateObject Object { get; set; }

    [JsonPropertyName("host")]
    public required string Host { get; set; }

    [Nullable]
    [JsonPropertyName("uid")]
    public string? Uid { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Takes this event type, and fits what the booking was routed with. Otherwise it needs `any_host`.
    /// </summary>
    [JsonPropertyName("member")]
    public required bool Member { get; set; }

    [JsonPropertyName("available")]
    public required bool Available { get; set; }

    /// <summary>
    /// Why they aren't available, the first of `reasons`.
    /// </summary>
    [Nullable]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    /// <summary>
    /// Everything in the way, each needing its override. `already_claimed` can't be overridden.
    /// </summary>
    [JsonPropertyName("reasons")]
    public IEnumerable<string> Reasons { get; set; } = new List<string>();

    /// <summary>
    /// Their live bookings in the week from this one.
    /// </summary>
    [JsonPropertyName("load")]
    public required double Load { get; set; }

    /// <summary>
    /// Their place in who a pool would pick next, from 1. Null for a non-member.
    /// </summary>
    [Nullable]
    [JsonPropertyName("rank")]
    public double? Rank { get; set; }

    /// <summary>
    /// They haven't connected what this booking's meeting needs, so it'd have none.
    /// </summary>
    [JsonPropertyName("meeting_provider_missing")]
    public required bool MeetingProviderMissing { get; set; }

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
