using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

/// <summary>
/// Changes the reasons given: a weight in [0, 0.99] replaces the default, `null` goes back to it.
/// </summary>
[Serializable]
public record UpdateRiskSettingsRequestReasonWeights : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("email.invalid")]
    public double? EmailInvalid { get; set; }

    [JsonPropertyName("email.disposable")]
    public double? EmailDisposable { get; set; }

    [JsonPropertyName("email.undeliverable")]
    public double? EmailUndeliverable { get; set; }

    [JsonPropertyName("email.role_account")]
    public double? EmailRoleAccount { get; set; }

    [JsonPropertyName("email.typo")]
    public double? EmailTypo { get; set; }

    [JsonPropertyName("email.domain_new")]
    public double? EmailDomainNew { get; set; }

    [JsonPropertyName("ip.tor")]
    public double? IpTor { get; set; }

    [JsonPropertyName("ip.vpn_network")]
    public double? IpVpnNetwork { get; set; }

    [JsonPropertyName("ip.hosting_provider")]
    public double? IpHostingProvider { get; set; }

    [JsonPropertyName("ip.vpn")]
    public double? IpVpn { get; set; }

    [JsonPropertyName("ip.proxy")]
    public double? IpProxy { get; set; }

    [JsonPropertyName("ip.relay")]
    public double? IpRelay { get; set; }

    [JsonPropertyName("ip.private")]
    public double? IpPrivate { get; set; }

    [JsonPropertyName("velocity.signups_per_ip_1h")]
    public double? VelocitySignupsPerIp1H { get; set; }

    [JsonPropertyName("velocity.signups_per_ip_24h")]
    public double? VelocitySignupsPerIp24H { get; set; }

    [JsonPropertyName("velocity.signups_per_subnet_1h")]
    public double? VelocitySignupsPerSubnet1H { get; set; }

    [JsonPropertyName("velocity.signups_per_email_domain_1h")]
    public double? VelocitySignupsPerEmailDomain1H { get; set; }

    [JsonPropertyName("velocity.signups_per_mailbox_24h")]
    public double? VelocitySignupsPerMailbox24H { get; set; }

    [JsonPropertyName("velocity.signups_per_device_24h")]
    public double? VelocitySignupsPerDevice24H { get; set; }

    [JsonPropertyName("velocity.checkouts_per_ip_1h")]
    public double? VelocityCheckoutsPerIp1H { get; set; }

    [JsonPropertyName("velocity.checkouts_per_user_1h")]
    public double? VelocityCheckoutsPerUser1H { get; set; }

    [JsonPropertyName("velocity.checkouts_per_card_24h")]
    public double? VelocityCheckoutsPerCard24H { get; set; }

    [JsonPropertyName("velocity.logins_per_ip_1h")]
    public double? VelocityLoginsPerIp1H { get; set; }

    [JsonPropertyName("velocity.logins_per_user_1h")]
    public double? VelocityLoginsPerUser1H { get; set; }

    [JsonPropertyName("velocity.events_per_ip_1h")]
    public double? VelocityEventsPerIp1H { get; set; }

    [JsonPropertyName("velocity.events_per_user_1h")]
    public double? VelocityEventsPerUser1H { get; set; }

    [JsonPropertyName("duplicate.canonical_mailbox")]
    public double? DuplicateCanonicalMailbox { get; set; }

    [JsonPropertyName("duplicate.device")]
    public double? DuplicateDevice { get; set; }

    [JsonPropertyName("history.fraud_mailbox")]
    public double? HistoryFraudMailbox { get; set; }

    [JsonPropertyName("history.fraud_user")]
    public double? HistoryFraudUser { get; set; }

    [JsonPropertyName("history.fraud_ip")]
    public double? HistoryFraudIp { get; set; }

    [JsonPropertyName("history.fraud_subnet")]
    public double? HistoryFraudSubnet { get; set; }

    [JsonPropertyName("history.fraud_card")]
    public double? HistoryFraudCard { get; set; }

    [JsonPropertyName("history.fraud_device")]
    public double? HistoryFraudDevice { get; set; }

    [JsonPropertyName("checkout.card_country_mismatch")]
    public double? CheckoutCardCountryMismatch { get; set; }

    [JsonPropertyName("checkout.billing_country_mismatch")]
    public double? CheckoutBillingCountryMismatch { get; set; }

    [JsonPropertyName("checkout.prepaid_card")]
    public double? CheckoutPrepaidCard { get; set; }

    [JsonPropertyName("device.automation")]
    public double? DeviceAutomation { get; set; }

    [JsonPropertyName("device.invalid")]
    public double? DeviceInvalid { get; set; }

    [JsonPropertyName("login.new_country")]
    public double? LoginNewCountry { get; set; }

    [JsonPropertyName("login.new_network")]
    public double? LoginNewNetwork { get; set; }

    [JsonPropertyName("captcha.failed")]
    public double? CaptchaFailed { get; set; }

    [JsonPropertyName("captcha.missing")]
    public double? CaptchaMissing { get; set; }

    [JsonPropertyName("content.spam")]
    public double? ContentSpam { get; set; }

    [JsonPropertyName("content.phishing")]
    public double? ContentPhishing { get; set; }

    [JsonPropertyName("content.malware")]
    public double? ContentMalware { get; set; }

    [JsonPropertyName("content.fraud")]
    public double? ContentFraud { get; set; }

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
