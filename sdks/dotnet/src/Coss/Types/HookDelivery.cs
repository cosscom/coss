using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record HookDelivery : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required HookDeliveryObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("application_id")]
    public required string ApplicationId { get; set; }

    [JsonPropertyName("message_id")]
    public required string MessageId { get; set; }

    [JsonPropertyName("endpoint_id")]
    public required string EndpointId { get; set; }

    /// <summary>
    /// `pending`: waiting for its next attempt. `succeeded`: the endpoint answered 2xx. `failed`: every attempt failed, or the endpoint was disabled or deleted.
    /// </summary>
    [JsonPropertyName("status")]
    public required HookDeliveryStatus Status { get; set; }

    [JsonPropertyName("attempt_count")]
    public required long AttemptCount { get; set; }

    [Nullable]
    [JsonPropertyName("next_attempt_at")]
    public DateTime? NextAttemptAt { get; set; }

    [Nullable]
    [JsonPropertyName("last_status_code")]
    public long? LastStatusCode { get; set; }

    [Nullable]
    [JsonPropertyName("last_error")]
    public string? LastError { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [Nullable]
    [JsonPropertyName("finished_at")]
    public DateTime? FinishedAt { get; set; }

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
