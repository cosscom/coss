using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// How it was given, when it was as whole dates.
/// </summary>
[Serializable]
public record SchedulingOutOfOfficeAllDay : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("start_date")]
    public required string StartDate { get; set; }

    [JsonPropertyName("end_date")]
    public required string EndDate { get; set; }

    [JsonPropertyName("time_zone")]
    public required string TimeZone { get; set; }

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
