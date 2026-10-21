using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateMarketingSettingsRequest
{
    [JsonPropertyName("display_name")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("mailing_address")]
    public string? MailingAddress { get; set; }

    [JsonPropertyName("double_opt_in_default")]
    public bool? DoubleOptInDefault { get; set; }

    [JsonPropertyName("confirmation_from")]
    public string? ConfirmationFrom { get; set; }

    [JsonPropertyName("confirmation_subject")]
    public string? ConfirmationSubject { get; set; }

    [JsonPropertyName("confirmation_html")]
    public string? ConfirmationHtml { get; set; }

    [JsonPropertyName("confirmation_text")]
    public string? ConfirmationText { get; set; }

    [JsonPropertyName("confirmed_redirect_url")]
    public string? ConfirmedRedirectUrl { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
