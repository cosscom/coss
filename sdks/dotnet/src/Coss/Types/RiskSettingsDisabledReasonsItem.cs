using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskSettingsDisabledReasonsItem.RiskSettingsDisabledReasonsItemSerializer))]
[Serializable]
public readonly record struct RiskSettingsDisabledReasonsItem : IStringEnum
{
    public static readonly RiskSettingsDisabledReasonsItem EmailInvalid = new(Values.EmailInvalid);

    public static readonly RiskSettingsDisabledReasonsItem EmailDisposable = new(
        Values.EmailDisposable
    );

    public static readonly RiskSettingsDisabledReasonsItem EmailUndeliverable = new(
        Values.EmailUndeliverable
    );

    public static readonly RiskSettingsDisabledReasonsItem EmailRoleAccount = new(
        Values.EmailRoleAccount
    );

    public static readonly RiskSettingsDisabledReasonsItem EmailTypo = new(Values.EmailTypo);

    public static readonly RiskSettingsDisabledReasonsItem EmailDomainNew = new(
        Values.EmailDomainNew
    );

    public static readonly RiskSettingsDisabledReasonsItem IpTor = new(Values.IpTor);

    public static readonly RiskSettingsDisabledReasonsItem IpVpnNetwork = new(Values.IpVpnNetwork);

    public static readonly RiskSettingsDisabledReasonsItem IpHostingProvider = new(
        Values.IpHostingProvider
    );

    public static readonly RiskSettingsDisabledReasonsItem IpVpn = new(Values.IpVpn);

    public static readonly RiskSettingsDisabledReasonsItem IpProxy = new(Values.IpProxy);

    public static readonly RiskSettingsDisabledReasonsItem IpRelay = new(Values.IpRelay);

    public static readonly RiskSettingsDisabledReasonsItem IpPrivate = new(Values.IpPrivate);

    public static readonly RiskSettingsDisabledReasonsItem VelocitySignupsPerIp1H = new(
        Values.VelocitySignupsPerIp1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocitySignupsPerIp24H = new(
        Values.VelocitySignupsPerIp24H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocitySignupsPerSubnet1H = new(
        Values.VelocitySignupsPerSubnet1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocitySignupsPerEmailDomain1H = new(
        Values.VelocitySignupsPerEmailDomain1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocitySignupsPerMailbox24H = new(
        Values.VelocitySignupsPerMailbox24H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocitySignupsPerDevice24H = new(
        Values.VelocitySignupsPerDevice24H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityCheckoutsPerIp1H = new(
        Values.VelocityCheckoutsPerIp1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityCheckoutsPerUser1H = new(
        Values.VelocityCheckoutsPerUser1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityCheckoutsPerCard24H = new(
        Values.VelocityCheckoutsPerCard24H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityLoginsPerIp1H = new(
        Values.VelocityLoginsPerIp1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityLoginsPerUser1H = new(
        Values.VelocityLoginsPerUser1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityEventsPerIp1H = new(
        Values.VelocityEventsPerIp1H
    );

    public static readonly RiskSettingsDisabledReasonsItem VelocityEventsPerUser1H = new(
        Values.VelocityEventsPerUser1H
    );

    public static readonly RiskSettingsDisabledReasonsItem DuplicateCanonicalMailbox = new(
        Values.DuplicateCanonicalMailbox
    );

    public static readonly RiskSettingsDisabledReasonsItem DuplicateDevice = new(
        Values.DuplicateDevice
    );

    public static readonly RiskSettingsDisabledReasonsItem HistoryFraudMailbox = new(
        Values.HistoryFraudMailbox
    );

    public static readonly RiskSettingsDisabledReasonsItem HistoryFraudUser = new(
        Values.HistoryFraudUser
    );

    public static readonly RiskSettingsDisabledReasonsItem HistoryFraudIp = new(
        Values.HistoryFraudIp
    );

    public static readonly RiskSettingsDisabledReasonsItem HistoryFraudSubnet = new(
        Values.HistoryFraudSubnet
    );

    public static readonly RiskSettingsDisabledReasonsItem HistoryFraudCard = new(
        Values.HistoryFraudCard
    );

    public static readonly RiskSettingsDisabledReasonsItem HistoryFraudDevice = new(
        Values.HistoryFraudDevice
    );

    public static readonly RiskSettingsDisabledReasonsItem CheckoutCardCountryMismatch = new(
        Values.CheckoutCardCountryMismatch
    );

    public static readonly RiskSettingsDisabledReasonsItem CheckoutBillingCountryMismatch = new(
        Values.CheckoutBillingCountryMismatch
    );

    public static readonly RiskSettingsDisabledReasonsItem CheckoutPrepaidCard = new(
        Values.CheckoutPrepaidCard
    );

    public static readonly RiskSettingsDisabledReasonsItem DeviceAutomation = new(
        Values.DeviceAutomation
    );

    public static readonly RiskSettingsDisabledReasonsItem DeviceInvalid = new(
        Values.DeviceInvalid
    );

    public static readonly RiskSettingsDisabledReasonsItem LoginNewCountry = new(
        Values.LoginNewCountry
    );

    public static readonly RiskSettingsDisabledReasonsItem LoginNewNetwork = new(
        Values.LoginNewNetwork
    );

    public static readonly RiskSettingsDisabledReasonsItem CaptchaFailed = new(
        Values.CaptchaFailed
    );

    public static readonly RiskSettingsDisabledReasonsItem CaptchaMissing = new(
        Values.CaptchaMissing
    );

    public RiskSettingsDisabledReasonsItem(string value)
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
    public static RiskSettingsDisabledReasonsItem FromCustom(string value)
    {
        return new RiskSettingsDisabledReasonsItem(value);
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

    public static bool operator ==(RiskSettingsDisabledReasonsItem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskSettingsDisabledReasonsItem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskSettingsDisabledReasonsItem value) => value.Value;

    public static explicit operator RiskSettingsDisabledReasonsItem(string value) => new(value);

    internal class RiskSettingsDisabledReasonsItemSerializer
        : JsonConverter<RiskSettingsDisabledReasonsItem>
    {
        public override RiskSettingsDisabledReasonsItem Read(
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
            return new RiskSettingsDisabledReasonsItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskSettingsDisabledReasonsItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskSettingsDisabledReasonsItem ReadAsPropertyName(
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
            return new RiskSettingsDisabledReasonsItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskSettingsDisabledReasonsItem value,
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
    }
}
