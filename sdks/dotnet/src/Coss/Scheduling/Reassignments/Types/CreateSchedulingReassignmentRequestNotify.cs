using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record CreateSchedulingReassignmentRequestNotify : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Tell attendees. Default: true.
    /// </summary>
    [Optional]
    [JsonPropertyName("attendees")]
    public bool? Attendees { get; set; }

    /// <summary>
    /// `digest` (the default) sends each host one email for the run.
    /// </summary>
    [Optional]
    [JsonPropertyName("hosts")]
    public CreateSchedulingReassignmentRequestNotifyHosts? Hosts { get; set; }

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
