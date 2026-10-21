using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskReasonCode.RiskReasonCodeSerializer))]
[Serializable]
public readonly record struct RiskReasonCode : IStringEnum
{
    public static readonly RiskReasonCode EmailInvalid = new(Values.EmailInvalid);

    public static readonly RiskReasonCode EmailDisposable = new(Values.EmailDisposable);

    public static readonly RiskReasonCode EmailUndeliverable = new(Values.EmailUndeliverable);

    public static readonly RiskReasonCode EmailRoleAccount = new(Values.EmailRoleAccount);

    public static readonly RiskReasonCode EmailTypo = new(Values.EmailTypo);

    public static readonly RiskReasonCode EmailDomainNew = new(Values.EmailDomainNew);

    public static readonly RiskReasonCode IpTor = new(Values.IpTor);

    public static readonly RiskReasonCode IpVpnNetwork = new(Values.IpVpnNetwork);

    public static readonly RiskReasonCode IpHostingProvider = new(Values.IpHostingProvider);

    public static readonly RiskReasonCode IpVpn = new(Values.IpVpn);

    public static readonly RiskReasonCode IpProxy = new(Values.IpProxy);

    public static readonly RiskReasonCode IpRelay = new(Values.IpRelay);

    public static readonly RiskReasonCode IpPrivate = new(Values.IpPrivate);

    public static readonly RiskReasonCode VelocitySignupsPerIp1H = new(
        Values.VelocitySignupsPerIp1H
    );

    public static readonly RiskReasonCode VelocitySignupsPerIp24H = new(
        Values.VelocitySignupsPerIp24H
    );

    public static readonly RiskReasonCode VelocitySignupsPerSubnet1H = new(
        Values.VelocitySignupsPerSubnet1H
    );

    public static readonly RiskReasonCode VelocitySignupsPerEmailDomain1H = new(
        Values.VelocitySignupsPerEmailDomain1H
    );

    public static readonly RiskReasonCode VelocitySignupsPerMailbox24H = new(
        Values.VelocitySignupsPerMailbox24H
    );

    public static readonly RiskReasonCode VelocitySignupsPerDevice24H = new(
        Values.VelocitySignupsPerDevice24H
    );

    public static readonly RiskReasonCode VelocityCheckoutsPerIp1H = new(
        Values.VelocityCheckoutsPerIp1H
    );

    public static readonly RiskReasonCode VelocityCheckoutsPerUser1H = new(
        Values.VelocityCheckoutsPerUser1H
    );

    public static readonly RiskReasonCode VelocityCheckoutsPerCard24H = new(
        Values.VelocityCheckoutsPerCard24H
    );

    public static readonly RiskReasonCode VelocityLoginsPerIp1H = new(Values.VelocityLoginsPerIp1H);

    public static readonly RiskReasonCode VelocityLoginsPerUser1H = new(
        Values.VelocityLoginsPerUser1H
    );

    public static readonly RiskReasonCode VelocityEventsPerIp1H = new(Values.VelocityEventsPerIp1H);

    public static readonly RiskReasonCode VelocityEventsPerUser1H = new(
        Values.VelocityEventsPerUser1H
    );

    public static readonly RiskReasonCode DuplicateCanonicalMailbox = new(
        Values.DuplicateCanonicalMailbox
    );

    public static readonly RiskReasonCode DuplicateDevice = new(Values.DuplicateDevice);

    public static readonly RiskReasonCode HistoryFraudMailbox = new(Values.HistoryFraudMailbox);

    public static readonly RiskReasonCode HistoryFraudUser = new(Values.HistoryFraudUser);

    public static readonly RiskReasonCode HistoryFraudIp = new(Values.HistoryFraudIp);

    public static readonly RiskReasonCode HistoryFraudSubnet = new(Values.HistoryFraudSubnet);

    public static readonly RiskReasonCode HistoryFraudCard = new(Values.HistoryFraudCard);

    public static readonly RiskReasonCode HistoryFraudDevice = new(Values.HistoryFraudDevice);

    public static readonly RiskReasonCode CheckoutCardCountryMismatch = new(
        Values.CheckoutCardCountryMismatch
    );

    public static readonly RiskReasonCode CheckoutBillingCountryMismatch = new(
        Values.CheckoutBillingCountryMismatch
    );

    public static readonly RiskReasonCode CheckoutPrepaidCard = new(Values.CheckoutPrepaidCard);

    public static readonly RiskReasonCode DeviceAutomation = new(Values.DeviceAutomation);

    public static readonly RiskReasonCode DeviceInvalid = new(Values.DeviceInvalid);

    public static readonly RiskReasonCode LoginNewCountry = new(Values.LoginNewCountry);

    public static readonly RiskReasonCode LoginNewNetwork = new(Values.LoginNewNetwork);

    public static readonly RiskReasonCode CaptchaFailed = new(Values.CaptchaFailed);

    public static readonly RiskReasonCode CaptchaMissing = new(Values.CaptchaMissing);

    public static readonly RiskReasonCode ContentSpam = new(Values.ContentSpam);

    public static readonly RiskReasonCode ContentPhishing = new(Values.ContentPhishing);

    public static readonly RiskReasonCode ContentMalware = new(Values.ContentMalware);

    public static readonly RiskReasonCode ContentFraud = new(Values.ContentFraud);

    public static readonly RiskReasonCode RuleMatched = new(Values.RuleMatched);

    public static readonly RiskReasonCode ListBlocked = new(Values.ListBlocked);

    public static readonly RiskReasonCode ListAllowed = new(Values.ListAllowed);

    public RiskReasonCode(string value)
    {
        Value = value;
    }

    /// <summary>
    /// The string value of the enum.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a string enum with the given value.
    /// </summary>
    public static RiskReasonCode FromCustom(string value)
    {
        return new RiskReasonCode(value);
    }

    public bool Equals(string? other)
    {
        return Value.Equals(other);
    }

    /// <summary>
    /// Returns the string value of the enum.
    /// </summary>
    public override string ToString()
    {
        return Value;
    }

    public static bool operator ==(RiskReasonCode value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskReasonCode value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskReasonCode value) => value.Value;

    public static explicit operator RiskReasonCode(string value) => new(value);

    internal class RiskReasonCodeSerializer : JsonConverter<RiskReasonCode>
    {
        public override RiskReasonCode Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON value could not be read as a string."
                );
            return new RiskReasonCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskReasonCode ReadAsPropertyName(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON property name could not be read as a string."
                );
            return new RiskReasonCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Value);
        }
    }

    /// <summary>
    /// Constant strings for enum values
    /// </summary>
    [Serializable]
    public static class Values
    {
        public const string EmailInvalid = "email.invalid";

        public const string EmailDisposable = "email.disposable";

        public const string EmailUndeliverable = "email.undeliverable";

        public const string EmailRoleAccount = "email.role_account";

        public const string EmailTypo = "email.typo";

        public const string EmailDomainNew = "email.domain_new";

        public const string IpTor = "ip.tor";

        public const string IpVpnNetwork = "ip.vpn_network";

        public const string IpHostingProvider = "ip.hosting_provider";

        public const string IpVpn = "ip.vpn";

        public const string IpProxy = "ip.proxy";

        public const string IpRelay = "ip.relay";

        public const string IpPrivate = "ip.private";

        public const string VelocitySignupsPerIp1H = "velocity.signups_per_ip_1h";

        public const string VelocitySignupsPerIp24H = "velocity.signups_per_ip_24h";

        public const string VelocitySignupsPerSubnet1H = "velocity.signups_per_subnet_1h";

        public const string VelocitySignupsPerEmailDomain1H =
            "velocity.signups_per_email_domain_1h";

        public const string VelocitySignupsPerMailbox24H = "velocity.signups_per_mailbox_24h";

        public const string VelocitySignupsPerDevice24H = "velocity.signups_per_device_24h";

        public const string VelocityCheckoutsPerIp1H = "velocity.checkouts_per_ip_1h";

        public const string VelocityCheckoutsPerUser1H = "velocity.checkouts_per_user_1h";

        public const string VelocityCheckoutsPerCard24H = "velocity.checkouts_per_card_24h";

        public const string VelocityLoginsPerIp1H = "velocity.logins_per_ip_1h";

        public const string VelocityLoginsPerUser1H = "velocity.logins_per_user_1h";

        public const string VelocityEventsPerIp1H = "velocity.events_per_ip_1h";

        public const string VelocityEventsPerUser1H = "velocity.events_per_user_1h";

        public const string DuplicateCanonicalMailbox = "duplicate.canonical_mailbox";

        public const string DuplicateDevice = "duplicate.device";

        public const string HistoryFraudMailbox = "history.fraud_mailbox";

        public const string HistoryFraudUser = "history.fraud_user";

        public const string HistoryFraudIp = "history.fraud_ip";

        public const string HistoryFraudSubnet = "history.fraud_subnet";

        public const string HistoryFraudCard = "history.fraud_card";

        public const string HistoryFraudDevice = "history.fraud_device";

        public const string CheckoutCardCountryMismatch = "checkout.card_country_mismatch";

        public const string CheckoutBillingCountryMismatch = "checkout.billing_country_mismatch";

        public const string CheckoutPrepaidCard = "checkout.prepaid_card";

        public const string DeviceAutomation = "device.automation";

        public const string DeviceInvalid = "device.invalid";

        public const string LoginNewCountry = "login.new_country";

        public const string LoginNewNetwork = "login.new_network";

        public const string CaptchaFailed = "captcha.failed";

        public const string CaptchaMissing = "captcha.missing";

        public const string ContentSpam = "content.spam";

        public const string ContentPhishing = "content.phishing";

        public const string ContentMalware = "content.malware";

        public const string ContentFraud = "content.fraud";

        public const string RuleMatched = "rule.matched";

        public const string ListBlocked = "list.blocked";

        public const string ListAllowed = "list.allowed";
    }
}
