using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record VerificationWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("verification_id")]
    public required string VerificationId { get; set; }

    [JsonPropertyName("channel")]
    public required VerificationWebhookEventDataChannel Channel { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

    [JsonPropertyName("status")]
    public required VerificationWebhookEventDataStatus Status { get; set; }

    [Nullable]
    [JsonPropertyName("failure")]
    public VerificationWebhookEventDataFailure? Failure { get; set; }

    [JsonPropertyName("reasons")]
    public IEnumerable<VerificationWebhookEventDataReasonsItem> Reasons { get; set; } =
        new List<VerificationWebhookEventDataReasonsItem>();

    [JsonPropertyName("tags")]
    public IEnumerable<VerificationWebhookEventDataTagsItem> Tags { get; set; } =
        new List<VerificationWebhookEventDataTagsItem>();

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

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
