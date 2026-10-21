using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SmsWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Why the message failed or wasn't delivered.
    /// </summary>
    [Optional]
    [JsonPropertyName("failure")]
    public SmsWebhookEventDataFailure? Failure { get; set; }

    /// <summary>
    /// The provider's or carrier's own error code, e.g. `30007`.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("provider_error_code")]
    public Optional<string?> ProviderErrorCode { get; set; }

    /// <summary>
    /// `sms.suppressed`: the entry that made coss.com skip the number.
    /// </summary>
    [Optional]
    [JsonPropertyName("suppression")]
    public SmsWebhookEventDataSuppression? Suppression { get; set; }

    [JsonPropertyName("sms_id")]
    public required string SmsId { get; set; }

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

    [JsonPropertyName("country")]
    public required string Country { get; set; }

    [JsonPropertyName("segments")]
    public required long Segments { get; set; }

    [JsonPropertyName("tags")]
    public IEnumerable<SmsWebhookEventDataTagsItem> Tags { get; set; } =
        new List<SmsWebhookEventDataTagsItem>();

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
