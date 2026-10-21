using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskCalibrationReasonCode.RiskCalibrationReasonCodeSerializer))]
[Serializable]
public readonly record struct RiskCalibrationReasonCode : IStringEnum
{
    public static readonly RiskCalibrationReasonCode EmailInvalid = new(Values.EmailInvalid);

    public static readonly RiskCalibrationReasonCode EmailDisposable = new(Values.EmailDisposable);

    public static readonly RiskCalibrationReasonCode EmailUndeliverable = new(
        Values.EmailUndeliverable
    );

    public static readonly RiskCalibrationReasonCode EmailRoleAccount = new(
        Values.EmailRoleAccount
    );

    public static readonly RiskCalibrationReasonCode EmailTypo = new(Values.EmailTypo);

    public static readonly RiskCalibrationReasonCode EmailDomainNew = new(Values.EmailDomainNew);

    public static readonly RiskCalibrationReasonCode IpTor = new(Values.IpTor);

    public static readonly RiskCalibrationReasonCode IpVpnNetwork = new(Values.IpVpnNetwork);

    public static readonly RiskCalibrationReasonCode IpHostingProvider = new(
        Values.IpHostingProvider
    );

    public static readonly RiskCalibrationReasonCode IpVpn = new(Values.IpVpn);

    public static readonly RiskCalibrationReasonCode IpProxy = new(Values.IpProxy);

    public static readonly RiskCalibrationReasonCode IpRelay = new(Values.IpRelay);

    public static readonly RiskCalibrationReasonCode IpPrivate = new(Values.IpPrivate);

    public static readonly RiskCalibrationReasonCode VelocitySignupsPerIp1H = new(
        Values.VelocitySignupsPerIp1H
    );

    public static readonly RiskCalibrationReasonCode VelocitySignupsPerIp24H = new(
        Values.VelocitySignupsPerIp24H
    );

    public static readonly RiskCalibrationReasonCode VelocitySignupsPerSubnet1H = new(
        Values.VelocitySignupsPerSubnet1H
    );

    public static readonly RiskCalibrationReasonCode VelocitySignupsPerEmailDomain1H = new(
        Values.VelocitySignupsPerEmailDomain1H
    );

    public static readonly RiskCalibrationReasonCode VelocitySignupsPerMailbox24H = new(
        Values.VelocitySignupsPerMailbox24H
    );

    public static readonly RiskCalibrationReasonCode VelocitySignupsPerDevice24H = new(
        Values.VelocitySignupsPerDevice24H
    );

    public static readonly RiskCalibrationReasonCode VelocityCheckoutsPerIp1H = new(
        Values.VelocityCheckoutsPerIp1H
    );

    public static readonly RiskCalibrationReasonCode VelocityCheckoutsPerUser1H = new(
        Values.VelocityCheckoutsPerUser1H
    );

    public static readonly RiskCalibrationReasonCode VelocityCheckoutsPerCard24H = new(
        Values.VelocityCheckoutsPerCard24H
    );

    public static readonly RiskCalibrationReasonCode VelocityLoginsPerIp1H = new(
        Values.VelocityLoginsPerIp1H
    );

    public static readonly RiskCalibrationReasonCode VelocityLoginsPerUser1H = new(
        Values.VelocityLoginsPerUser1H
    );

    public static readonly RiskCalibrationReasonCode VelocityEventsPerIp1H = new(
        Values.VelocityEventsPerIp1H
    );

    public static readonly RiskCalibrationReasonCode VelocityEventsPerUser1H = new(
        Values.VelocityEventsPerUser1H
    );

    public static readonly RiskCalibrationReasonCode DuplicateCanonicalMailbox = new(
        Values.DuplicateCanonicalMailbox
    );

    public static readonly RiskCalibrationReasonCode DuplicateDevice = new(Values.DuplicateDevice);

    public static readonly RiskCalibrationReasonCode HistoryFraudMailbox = new(
        Values.HistoryFraudMailbox
    );

    public static readonly RiskCalibrationReasonCode HistoryFraudUser = new(
        Values.HistoryFraudUser
    );

    public static readonly RiskCalibrationReasonCode HistoryFraudIp = new(Values.HistoryFraudIp);

    public static readonly RiskCalibrationReasonCode HistoryFraudSubnet = new(
        Values.HistoryFraudSubnet
    );

    public static readonly RiskCalibrationReasonCode HistoryFraudCard = new(
        Values.HistoryFraudCard
    );

    public static readonly RiskCalibrationReasonCode HistoryFraudDevice = new(
        Values.HistoryFraudDevice
    );

    public static readonly RiskCalibrationReasonCode CheckoutCardCountryMismatch = new(
        Values.CheckoutCardCountryMismatch
    );

    public static readonly RiskCalibrationReasonCode CheckoutBillingCountryMismatch = new(
        Values.CheckoutBillingCountryMismatch
    );

    public static readonly RiskCalibrationReasonCode CheckoutPrepaidCard = new(
        Values.CheckoutPrepaidCard
    );

    public static readonly RiskCalibrationReasonCode DeviceAutomation = new(
        Values.DeviceAutomation
    );

    public static readonly RiskCalibrationReasonCode DeviceInvalid = new(Values.DeviceInvalid);

    public static readonly RiskCalibrationReasonCode LoginNewCountry = new(Values.LoginNewCountry);

    public static readonly RiskCalibrationReasonCode LoginNewNetwork = new(Values.LoginNewNetwork);

    public static readonly RiskCalibrationReasonCode CaptchaFailed = new(Values.CaptchaFailed);

    public static readonly RiskCalibrationReasonCode CaptchaMissing = new(Values.CaptchaMissing);

    public static readonly RiskCalibrationReasonCode ContentSpam = new(Values.ContentSpam);

    public static readonly RiskCalibrationReasonCode ContentPhishing = new(Values.ContentPhishing);

    public static readonly RiskCalibrationReasonCode ContentMalware = new(Values.ContentMalware);

    public static readonly RiskCalibrationReasonCode ContentFraud = new(Values.ContentFraud);

    public RiskCalibrationReasonCode(string value)
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
    public static RiskCalibrationReasonCode FromCustom(string value)
    {
        return new RiskCalibrationReasonCode(value);
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

    public static bool operator ==(RiskCalibrationReasonCode value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskCalibrationReasonCode value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskCalibrationReasonCode value) => value.Value;

    public static explicit operator RiskCalibrationReasonCode(string value) => new(value);

    internal class RiskCalibrationReasonCodeSerializer : JsonConverter<RiskCalibrationReasonCode>
    {
        public override RiskCalibrationReasonCode Read(
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
            return new RiskCalibrationReasonCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskCalibrationReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskCalibrationReasonCode ReadAsPropertyName(
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
            return new RiskCalibrationReasonCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskCalibrationReasonCode value,
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
    }
}
