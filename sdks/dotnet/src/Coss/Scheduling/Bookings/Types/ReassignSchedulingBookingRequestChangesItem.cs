using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record ReassignSchedulingBookingRequestChangesItem : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The host leaving, by id or uid. Needed when it could be several.
    /// </summary>
    [Optional]
    [JsonPropertyName("from_host")]
    public string? FromHost { get; set; }

    /// <summary>
    /// The host taking over, by id or uid. Or set `auto`.
    /// </summary>
    [Optional]
    [JsonPropertyName("to_host")]
    public string? ToHost { get; set; }

    /// <summary>
    /// Let coss.com pick, as a pool would: the fairest who's free and fits what the booking was routed with.
    /// </summary>
    [Optional]
    [JsonPropertyName("auto")]
    public bool? Auto { get; set; }

    /// <summary>
    /// With `auto`: try these first, in order.
    /// </summary>
    [Optional]
    [JsonPropertyName("preferred_hosts")]
    public IEnumerable<string>? PreferredHosts { get; set; }

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
