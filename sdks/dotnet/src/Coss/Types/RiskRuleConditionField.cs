using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskRuleConditionField.RiskRuleConditionFieldSerializer))]
[Serializable]
public readonly record struct RiskRuleConditionField : IStringEnum
{
    public static readonly RiskRuleConditionField EmailValid = new(Values.EmailValid);

    public static readonly RiskRuleConditionField EmailDisposable = new(Values.EmailDisposable);

    public static readonly RiskRuleConditionField EmailUndeliverable = new(
        Values.EmailUndeliverable
    );

    public static readonly RiskRuleConditionField EmailRoleAccount = new(Values.EmailRoleAccount);

    public static readonly RiskRuleConditionField EmailFreeProvider = new(Values.EmailFreeProvider);

    public static readonly RiskRuleConditionField EmailTypo = new(Values.EmailTypo);

    public static readonly RiskRuleConditionField EmailDomainNew = new(Values.EmailDomainNew);

    public static readonly RiskRuleConditionField EmailDomain = new(Values.EmailDomain);

    public static readonly RiskRuleConditionField EmailDomainAgeDays = new(
        Values.EmailDomainAgeDays
    );

    public static readonly RiskRuleConditionField IpTor = new(Values.IpTor);

    public static readonly RiskRuleConditionField IpHosting = new(Values.IpHosting);

    public static readonly RiskRuleConditionField IpVpn = new(Values.IpVpn);

    public static readonly RiskRuleConditionField IpProxy = new(Values.IpProxy);

    public static readonly RiskRuleConditionField IpRelay = new(Values.IpRelay);

    public static readonly RiskRuleConditionField IpPrivate = new(Values.IpPrivate);

    public static readonly RiskRuleConditionField IpCountry = new(Values.IpCountry);

    public static readonly RiskRuleConditionField IpAsn = new(Values.IpAsn);

    public static readonly RiskRuleConditionField IpHostingProvider = new(Values.IpHostingProvider);

    public static readonly RiskRuleConditionField CaptchaPassed = new(Values.CaptchaPassed);

    public static readonly RiskRuleConditionField DuplicateCanonicalMailbox = new(
        Values.DuplicateCanonicalMailbox
    );

    public static readonly RiskRuleConditionField DuplicateDevice = new(Values.DuplicateDevice);

    public static readonly RiskRuleConditionField HistoryFraud = new(Values.HistoryFraud);

    public static readonly RiskRuleConditionField LoginNewCountry = new(Values.LoginNewCountry);

    public static readonly RiskRuleConditionField LoginNewNetwork = new(Values.LoginNewNetwork);

    public static readonly RiskRuleConditionField ContentSpam = new(Values.ContentSpam);

    public static readonly RiskRuleConditionField ContentPhishing = new(Values.ContentPhishing);

    public static readonly RiskRuleConditionField ContentMalware = new(Values.ContentMalware);

    public static readonly RiskRuleConditionField ContentFraud = new(Values.ContentFraud);

    public static readonly RiskRuleConditionField CheckoutAmount = new(Values.CheckoutAmount);

    public static readonly RiskRuleConditionField CheckoutCurrency = new(Values.CheckoutCurrency);

    public static readonly RiskRuleConditionField CheckoutCardCountry = new(
        Values.CheckoutCardCountry
    );

    public static readonly RiskRuleConditionField CheckoutCardFunding = new(
        Values.CheckoutCardFunding
    );

    public static readonly RiskRuleConditionField CheckoutBillingCountry = new(
        Values.CheckoutBillingCountry
    );

    public static readonly RiskRuleConditionField CheckoutShippingCountry = new(
        Values.CheckoutShippingCountry
    );

    public static readonly RiskRuleConditionField DeviceAutomation = new(Values.DeviceAutomation);

    public static readonly RiskRuleConditionField DeviceTimezone = new(Values.DeviceTimezone);

    public static readonly RiskRuleConditionField DeviceLanguage = new(Values.DeviceLanguage);

    public static readonly RiskRuleConditionField Score = new(Values.Score);

    public static readonly RiskRuleConditionField VelocityIp1H = new(Values.VelocityIp1H);

    public static readonly RiskRuleConditionField VelocityIp24H = new(Values.VelocityIp24H);

    public static readonly RiskRuleConditionField VelocitySubnet1H = new(Values.VelocitySubnet1H);

    public static readonly RiskRuleConditionField VelocitySubnet24H = new(Values.VelocitySubnet24H);

    public static readonly RiskRuleConditionField VelocityEmailDomain1H = new(
        Values.VelocityEmailDomain1H
    );

    public static readonly RiskRuleConditionField VelocityEmailDomain24H = new(
        Values.VelocityEmailDomain24H
    );

    public static readonly RiskRuleConditionField VelocityMailbox1H = new(Values.VelocityMailbox1H);

    public static readonly RiskRuleConditionField VelocityMailbox24H = new(
        Values.VelocityMailbox24H
    );

    public static readonly RiskRuleConditionField VelocityUser1H = new(Values.VelocityUser1H);

    public static readonly RiskRuleConditionField VelocityUser24H = new(Values.VelocityUser24H);

    public static readonly RiskRuleConditionField VelocityCard1H = new(Values.VelocityCard1H);

    public static readonly RiskRuleConditionField VelocityCard24H = new(Values.VelocityCard24H);

    public static readonly RiskRuleConditionField VelocityDevice1H = new(Values.VelocityDevice1H);

    public static readonly RiskRuleConditionField VelocityDevice24H = new(Values.VelocityDevice24H);

    public RiskRuleConditionField(string value)
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
    public static RiskRuleConditionField FromCustom(string value)
    {
        return new RiskRuleConditionField(value);
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

    public static bool operator ==(RiskRuleConditionField value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskRuleConditionField value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskRuleConditionField value) => value.Value;

    public static explicit operator RiskRuleConditionField(string value) => new(value);

    internal class RiskRuleConditionFieldSerializer : JsonConverter<RiskRuleConditionField>
    {
        public override RiskRuleConditionField Read(
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
            return new RiskRuleConditionField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskRuleConditionField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskRuleConditionField ReadAsPropertyName(
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
            return new RiskRuleConditionField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskRuleConditionField value,
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
        public const string EmailValid = "email.valid";

        public const string EmailDisposable = "email.disposable";

        public const string EmailUndeliverable = "email.undeliverable";

        public const string EmailRoleAccount = "email.role_account";

        public const string EmailFreeProvider = "email.free_provider";

        public const string EmailTypo = "email.typo";

        public const string EmailDomainNew = "email.domain_new";

        public const string EmailDomain = "email.domain";

        public const string EmailDomainAgeDays = "email.domain_age_days";

        public const string IpTor = "ip.tor";

        public const string IpHosting = "ip.hosting";

        public const string IpVpn = "ip.vpn";

        public const string IpProxy = "ip.proxy";

        public const string IpRelay = "ip.relay";

        public const string IpPrivate = "ip.private";

        public const string IpCountry = "ip.country";

        public const string IpAsn = "ip.asn";

        public const string IpHostingProvider = "ip.hosting_provider";

        public const string CaptchaPassed = "captcha.passed";

        public const string DuplicateCanonicalMailbox = "duplicate.canonical_mailbox";

        public const string DuplicateDevice = "duplicate.device";

        public const string HistoryFraud = "history.fraud";

        public const string LoginNewCountry = "login.new_country";

        public const string LoginNewNetwork = "login.new_network";

        public const string ContentSpam = "content.spam";

        public const string ContentPhishing = "content.phishing";

        public const string ContentMalware = "content.malware";

        public const string ContentFraud = "content.fraud";

        public const string CheckoutAmount = "checkout.amount";

        public const string CheckoutCurrency = "checkout.currency";

        public const string CheckoutCardCountry = "checkout.card_country";

        public const string CheckoutCardFunding = "checkout.card_funding";

        public const string CheckoutBillingCountry = "checkout.billing_country";

        public const string CheckoutShippingCountry = "checkout.shipping_country";

        public const string DeviceAutomation = "device.automation";

        public const string DeviceTimezone = "device.timezone";

        public const string DeviceLanguage = "device.language";

        public const string Score = "score";

        public const string VelocityIp1H = "velocity.ip_1h";

        public const string VelocityIp24H = "velocity.ip_24h";

        public const string VelocitySubnet1H = "velocity.subnet_1h";

        public const string VelocitySubnet24H = "velocity.subnet_24h";

        public const string VelocityEmailDomain1H = "velocity.email_domain_1h";

        public const string VelocityEmailDomain24H = "velocity.email_domain_24h";

        public const string VelocityMailbox1H = "velocity.mailbox_1h";

        public const string VelocityMailbox24H = "velocity.mailbox_24h";

        public const string VelocityUser1H = "velocity.user_1h";

        public const string VelocityUser24H = "velocity.user_24h";

        public const string VelocityCard1H = "velocity.card_1h";

        public const string VelocityCard24H = "velocity.card_24h";

        public const string VelocityDevice1H = "velocity.device_1h";

        public const string VelocityDevice24H = "velocity.device_24h";
    }
}
