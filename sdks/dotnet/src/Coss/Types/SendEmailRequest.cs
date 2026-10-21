using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record SendEmailRequest : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// An email address, optionally with a display name: "Acme &lt;hello@acme.com&gt;".
    /// </summary>
    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("to")]
    public required OneOf<string, IEnumerable<string>> To { get; set; }

    [JsonPropertyName("cc")]
    public OneOf<string, IEnumerable<string>>? Cc { get; set; }

    [JsonPropertyName("bcc")]
    public OneOf<string, IEnumerable<string>>? Bcc { get; set; }

    [JsonPropertyName("reply_to")]
    public OneOf<string, IEnumerable<string>>? ReplyTo { get; set; }

    /// <summary>
    /// Required unless the email is sent from a template (`template_id`).
    /// </summary>
    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    /// <summary>
    /// HTML body. Provide `html`, `text`, or both.
    /// </summary>
    [JsonPropertyName("html")]
    public string? Html { get; set; }

    /// <summary>
    /// Plain-text body. Without it, an `html` email goes out with a text part generated from the HTML.
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>
    /// Send a published email template (its id or alias) instead of `subject`, `html` and `text`.
    /// </summary>
    [JsonPropertyName("template_id")]
    public string? TemplateId { get; set; }

    /// <summary>
    /// A published version of the template to send. Defaults to the latest one.
    /// </summary>
    [JsonPropertyName("template_version")]
    public long? TemplateVersion { get; set; }

    /// <summary>
    /// The template locale to send, e.g. "pt-BR". Falls back to the language ("pt"), then to the template's default locale.
    /// </summary>
    [JsonPropertyName("locale")]
    public string? Locale { get; set; }

    /// <summary>
    /// Values for the template's variables, keyed by name.
    /// </summary>
    [JsonPropertyName("variables")]
    public Dictionary<string, object?>? Variables { get; set; }

    /// <summary>
    /// Up to 15 custom headers. Names are case-insensitive.
    /// </summary>
    [JsonPropertyName("headers")]
    public Dictionary<string, string>? Headers { get; set; }

    [JsonPropertyName("tags")]
    public IEnumerable<SendEmailRequestTagsItem>? Tags { get; set; }

    /// <summary>
    /// What kind of email this is, e.g. "marketing". Recipients suppressed for this category (or for every email) are skipped.
    /// </summary>
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    /// <summary>
    /// Send the email at this time instead of now (ISO 8601 with an offset, at most 30 days ahead). A time that is not in the future sends immediately. Scheduled emails can be rescheduled or canceled until they are sent.
    /// </summary>
    [JsonPropertyName("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    /// <summary>
    /// Up to 20 files, at most 25 MB combined.
    /// </summary>
    [JsonPropertyName("attachments")]
    public IEnumerable<SendEmailAttachment>? Attachments { get; set; }

    [JsonPropertyName("tracking")]
    public TrackingOptions? Tracking { get; set; }

    /// <summary>
    /// `transactional` (the default) or `marketing`. Marketing email goes out on its own sending infrastructure and reputation, so its complaints never hold up transactional mail. It needs the environment's postal address (marketing settings), exactly one recipient, and no `List-Unsubscribe` header: coss.com adds one-click unsubscribe headers and a footer with the address and an unsubscribe link (place them yourself with `{{{unsubscribe_url}}}`, `{{{preferences_url}}}` and `{{{mailing_address}}}`). Contacts who unsubscribed are skipped.
    /// </summary>
    [JsonPropertyName("stream")]
    public SendEmailRequestStream? Stream { get; set; }

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
