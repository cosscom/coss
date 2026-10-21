using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record HookEndpointRecovery : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required HookEndpointRecoveryObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("endpoint_id")]
    public required string EndpointId { get; set; }

    [JsonPropertyName("since")]
    public required DateTime Since { get; set; }

    [JsonPropertyName("until")]
    public required DateTime Until { get; set; }

    /// <summary>
    /// `pending` while coss.com is still requeueing deliveries (in the background).
    /// </summary>
    [JsonPropertyName("status")]
    public required HookEndpointRecoveryStatus Status { get; set; }

    /// <summary>
    /// Deliveries requeued so far.
    /// </summary>
    [JsonPropertyName("requeued")]
    public required long Requeued { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [Nullable]
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }

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
