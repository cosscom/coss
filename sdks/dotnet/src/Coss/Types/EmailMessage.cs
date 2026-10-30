using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record EmailMessage : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required EmailMessageObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("to")]
    public IEnumerable<string> To { get; set; } = new List<string>();

    [JsonPropertyName("cc")]
    public IEnumerable<string> Cc { get; set; } = new List<string>();

    [JsonPropertyName("bcc")]
    public IEnumerable<string> Bcc { get; set; } = new List<string>();

    [JsonPropertyName("reply_to")]
    public IEnumerable<string> ReplyTo { get; set; } = new List<string>();

    [JsonPropertyName("subject")]
    public required string Subject { get; set; }

    [Nullable]
    [JsonPropertyName("html")]
    public string? Html { get; set; }

    [Nullable]
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("headers")]
    public Dictionary<string, string> Headers { get; set; } = new Dictionary<string, string>();

    [JsonPropertyName("tags")]
    public IEnumerable<EmailMessageTagsItem> Tags { get; set; } = new List<EmailMessageTagsItem>();

    [Nullable]
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("stream")]
    public required EmailMessageStream Stream { get; set; }

    /// <summary>
    /// Whether the email was handed to the delivery provider. `scheduled` emails wait for `scheduled_at`; `canceled` ones were canceled before that. Per-recipient delivery is in `recipients`.
    /// </summary>
    [JsonPropertyName("status")]
    public required EmailMessageStatus Status { get; set; }

    /// <summary>
    /// Why the email failed; `null` unless `status` is `failed`.
    /// </summary>
    [Nullable]
    [JsonPropertyName("failure")]
    public EmailFailure? Failure { get; set; }

    [JsonPropertyName("recipients")]
    public IEnumerable<EmailRecipient> Recipients { get; set; } = new List<EmailRecipient>();

    /// <summary>
    /// Attachment metadata. Content is never returned, and is discarded once sent.
    /// </summary>
    [JsonPropertyName("attachments")]
    public IEnumerable<EmailAttachment> Attachments { get; set; } = new List<EmailAttachment>();

    /// <summary>
    /// True when sent from a sandbox environment (never delivered).
    /// </summary>
    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("tracking")]
    public required EmailTracking Tracking { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [Nullable]
    [JsonPropertyName("sent_at")]
    public DateTime? SentAt { get; set; }

    /// <summary>
    /// When the email was scheduled to be sent; `null` if it was not.
    /// </summary>
    [Nullable]
    [JsonPropertyName("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    /// <summary>
    /// The batch that sent the email; `null` if it was sent on its own.
    /// </summary>
    [Nullable]
    [JsonPropertyName("batch_id")]
    public string? BatchId { get; set; }

    /// <summary>
    /// The template the email was rendered from; `null` if it was sent without one.
    /// </summary>
    [Nullable]
    [JsonPropertyName("template")]
    public EmailTemplateReference? Template { get; set; }

    /// <summary>
    /// The broadcast the email is part of; `null` for any other email.
    /// </summary>
    [Nullable]
    [JsonPropertyName("broadcast_id")]
    public string? BroadcastId { get; set; }

    /// <summary>
    /// The sub-account the email was sent for; `null` if it was sent for none.
    /// </summary>
    [Nullable]
    [JsonPropertyName("subaccount_id")]
    public string? SubaccountId { get; set; }

    [JsonPropertyName("content_storage")]
    public required EmailContentStorage ContentStorage { get; set; }

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
