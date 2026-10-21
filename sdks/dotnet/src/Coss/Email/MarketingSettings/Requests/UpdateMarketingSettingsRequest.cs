using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateMarketingSettingsRequest
{
    [Nullable, Optional]
    [JsonPropertyName("display_name")]
    public Optional<string?> DisplayName { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("mailing_address")]
    public Optional<string?> MailingAddress { get; set; }

    [Optional]
    [JsonPropertyName("double_opt_in_default")]
    public bool? DoubleOptInDefault { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("confirmation_from")]
    public Optional<string?> ConfirmationFrom { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("confirmation_subject")]
    public Optional<string?> ConfirmationSubject { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("confirmation_html")]
    public Optional<string?> ConfirmationHtml { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("confirmation_text")]
    public Optional<string?> ConfirmationText { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("confirmed_redirect_url")]
    public Optional<string?> ConfirmedRedirectUrl { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
