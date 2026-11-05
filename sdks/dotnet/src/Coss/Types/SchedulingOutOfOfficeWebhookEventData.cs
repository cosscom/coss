using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingOutOfOfficeWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("out_of_office_id")]
    public required string OutOfOfficeId { get; set; }

    [JsonPropertyName("host_id")]
    public required string HostId { get; set; }

    [JsonPropertyName("start")]
    public required string Start { get; set; }

    [JsonPropertyName("end")]
    public required string End { get; set; }

    [Nullable]
    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("occurred_at")]
    public required string OccurredAt { get; set; }

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
