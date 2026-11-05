using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentStrategy : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Give them all to this host.
    /// </summary>
    [Optional]
    [JsonPropertyName("to_host")]
    public string? ToHost { get; set; }

    /// <summary>
    /// Try these first, in order.
    /// </summary>
    [Optional]
    [JsonPropertyName("preferred_hosts")]
    public IEnumerable<string>? PreferredHosts { get; set; }

    /// <summary>
    /// After `preferred_hosts`: `auto` picks the fairest who's free, `leave` keeps it where it is.
    /// </summary>
    [Optional]
    [JsonPropertyName("otherwise")]
    public SchedulingReassignmentStrategyOtherwise? Otherwise { get; set; }

    /// <summary>
    /// Who each goes to: a preview, with your changes.
    /// </summary>
    [Optional]
    [JsonPropertyName("assignments")]
    public IEnumerable<SchedulingReassignmentStrategyAssignmentsItem>? Assignments { get; set; }

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
