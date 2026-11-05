using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

/// <summary>
/// With `existing_bookings: reassign`: who they go to. Default: the fairest who's free.
/// </summary>
[Serializable]
public record CreateSchedulingOutOfOfficeRequestReassign : IJsonOnDeserialized
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
    /// After `preferred_hosts`: `auto` picks the fairest who's free (the default), `leave` keeps it where it is.
    /// </summary>
    [Optional]
    [JsonPropertyName("otherwise")]
    public CreateSchedulingOutOfOfficeRequestReassignOtherwise? Otherwise { get; set; }

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
