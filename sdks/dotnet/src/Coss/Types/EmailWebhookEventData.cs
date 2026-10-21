using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record EmailWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("bounce")]
    public EmailWebhookEventDataBounce? Bounce { get; set; }

    [JsonPropertyName("complaint")]
    public EmailWebhookEventDataComplaint? Complaint { get; set; }

    [JsonPropertyName("delay")]
    public EmailWebhookEventDataDelay? Delay { get; set; }

    [JsonPropertyName("delivery")]
    public EmailWebhookEventDataDelivery? Delivery { get; set; }

    [JsonPropertyName("failure")]
    public EmailWebhookEventDataFailure? Failure { get; set; }

    /// <summary>
    /// Only for `email.suppressed`: the entry that matched the recipient.
    /// </summary>
    [JsonPropertyName("suppression")]
    public EmailWebhookEventDataSuppression? Suppression { get; set; }

    /// <summary>
    /// Only for `email.suppressed` without `suppression`: the recipient is a contact who unsubscribed (from marketing, or from the email's topic, `topic`).
    /// </summary>
    [JsonPropertyName("unsubscribe")]
    public EmailWebhookEventDataUnsubscribe? Unsubscribe { get; set; }

    /// <summary>
    /// Only for `email.opened`.
    /// </summary>
    [JsonPropertyName("open")]
    public EmailWebhookEventDataOpen? Open { get; set; }

    /// <summary>
    /// Only for `email.clicked`.
    /// </summary>
    [JsonPropertyName("click")]
    public EmailWebhookEventDataClick? Click { get; set; }

    /// <summary>
    /// Only for `email.rescheduled`.
    /// </summary>
    [JsonPropertyName("reschedule")]
    public EmailWebhookEventDataReschedule? Reschedule { get; set; }

    [JsonPropertyName("email_id")]
    public required string EmailId { get; set; }

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("to")]
    public IEnumerable<string> To { get; set; } = new List<string>();

    [JsonPropertyName("subject")]
    public required string Subject { get; set; }

    [JsonPropertyName("tags")]
    public IEnumerable<EmailWebhookEventDataTagsItem> Tags { get; set; } =
        new List<EmailWebhookEventDataTagsItem>();

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("recipient")]
    public string? Recipient { get; set; }

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
