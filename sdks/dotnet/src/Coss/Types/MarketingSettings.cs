using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record MarketingSettings : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required MarketingSettingsObject Object { get; set; }

    /// <summary>
    /// The sender's name in the preference center (default: the organization's).
    /// </summary>
    [JsonPropertyName("display_name")]
    public string? DisplayName { get; set; }

    /// <summary>
    /// The postal address every marketing email carries (CAN-SPAM). Marketing emails can't be sent without one.
    /// </summary>
    [JsonPropertyName("mailing_address")]
    public string? MailingAddress { get; set; }

    /// <summary>
    /// Whether contacts upserted without `double_opt_in` must confirm first.
    /// </summary>
    [JsonPropertyName("double_opt_in_default")]
    public required bool DoubleOptInDefault { get; set; }

    /// <summary>
    /// The sender of confirmation emails (a verified domain's address for live keys).
    /// </summary>
    [JsonPropertyName("confirmation_from")]
    public string? ConfirmationFrom { get; set; }

    /// <summary>
    /// `null`: coss.com's default.
    /// </summary>
    [JsonPropertyName("confirmation_subject")]
    public string? ConfirmationSubject { get; set; }

    /// <summary>
    /// `null`: coss.com's default. Must contain `{{{confirmation_url}}}`.
    /// </summary>
    [JsonPropertyName("confirmation_html")]
    public string? ConfirmationHtml { get; set; }

    /// <summary>
    /// `null`: coss.com's default. Must contain `{{{confirmation_url}}}`.
    /// </summary>
    [JsonPropertyName("confirmation_text")]
    public string? ConfirmationText { get; set; }

    /// <summary>
    /// Where confirming sends the contact (https); `null`: a coss.com confirmation page.
    /// </summary>
    [JsonPropertyName("confirmed_redirect_url")]
    public string? ConfirmedRedirectUrl { get; set; }

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
