using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[JsonConverter(
    typeof(UpdateRiskSettingsRequestDisabledReasonsItem.UpdateRiskSettingsRequestDisabledReasonsItemSerializer)
)]
[Serializable]
public readonly record struct UpdateRiskSettingsRequestDisabledReasonsItem : IStringEnum
{
    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem EmailInvalid = new(
        Values.EmailInvalid
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem EmailDisposable = new(
        Values.EmailDisposable
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem EmailUndeliverable = new(
        Values.EmailUndeliverable
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem EmailRoleAccount = new(
        Values.EmailRoleAccount
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem EmailTypo = new(
        Values.EmailTypo
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem EmailDomainNew = new(
        Values.EmailDomainNew
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpTor = new(Values.IpTor);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpVpnNetwork = new(
        Values.IpVpnNetwork
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpHostingProvider = new(
        Values.IpHostingProvider
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpVpn = new(Values.IpVpn);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpProxy = new(
        Values.IpProxy
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpRelay = new(
        Values.IpRelay
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem IpPrivate = new(
        Values.IpPrivate
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocitySignupsPerIp1H =
        new(Values.VelocitySignupsPerIp1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocitySignupsPerIp24H =
        new(Values.VelocitySignupsPerIp24H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocitySignupsPerSubnet1H =
        new(Values.VelocitySignupsPerSubnet1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocitySignupsPerEmailDomain1H =
        new(Values.VelocitySignupsPerEmailDomain1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocitySignupsPerMailbox24H =
        new(Values.VelocitySignupsPerMailbox24H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocitySignupsPerDevice24H =
        new(Values.VelocitySignupsPerDevice24H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityCheckoutsPerIp1H =
        new(Values.VelocityCheckoutsPerIp1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityCheckoutsPerUser1H =
        new(Values.VelocityCheckoutsPerUser1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityCheckoutsPerCard24H =
        new(Values.VelocityCheckoutsPerCard24H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityLoginsPerIp1H = new(
        Values.VelocityLoginsPerIp1H
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityLoginsPerUser1H =
        new(Values.VelocityLoginsPerUser1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityEventsPerIp1H = new(
        Values.VelocityEventsPerIp1H
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem VelocityEventsPerUser1H =
        new(Values.VelocityEventsPerUser1H);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem DuplicateCanonicalMailbox =
        new(Values.DuplicateCanonicalMailbox);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem DuplicateDevice = new(
        Values.DuplicateDevice
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem HistoryFraudMailbox = new(
        Values.HistoryFraudMailbox
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem HistoryFraudUser = new(
        Values.HistoryFraudUser
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem HistoryFraudIp = new(
        Values.HistoryFraudIp
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem HistoryFraudSubnet = new(
        Values.HistoryFraudSubnet
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem HistoryFraudCard = new(
        Values.HistoryFraudCard
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem HistoryFraudDevice = new(
        Values.HistoryFraudDevice
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem CheckoutCardCountryMismatch =
        new(Values.CheckoutCardCountryMismatch);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem CheckoutBillingCountryMismatch =
        new(Values.CheckoutBillingCountryMismatch);

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem CheckoutPrepaidCard = new(
        Values.CheckoutPrepaidCard
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem DeviceAutomation = new(
        Values.DeviceAutomation
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem DeviceInvalid = new(
        Values.DeviceInvalid
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem LoginNewCountry = new(
        Values.LoginNewCountry
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem LoginNewNetwork = new(
        Values.LoginNewNetwork
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem CaptchaFailed = new(
        Values.CaptchaFailed
    );

    public static readonly UpdateRiskSettingsRequestDisabledReasonsItem CaptchaMissing = new(
        Values.CaptchaMissing
    );

    public UpdateRiskSettingsRequestDisabledReasonsItem(string value)
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
    public static UpdateRiskSettingsRequestDisabledReasonsItem FromCustom(string value)
    {
        return new UpdateRiskSettingsRequestDisabledReasonsItem(value);
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

    public static bool operator ==(
        UpdateRiskSettingsRequestDisabledReasonsItem value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateRiskSettingsRequestDisabledReasonsItem value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateRiskSettingsRequestDisabledReasonsItem value) =>
        value.Value;

    public static explicit operator UpdateRiskSettingsRequestDisabledReasonsItem(string value) =>
        new(value);

    internal class UpdateRiskSettingsRequestDisabledReasonsItemSerializer
        : JsonConverter<UpdateRiskSettingsRequestDisabledReasonsItem>
    {
        public override UpdateRiskSettingsRequestDisabledReasonsItem Read(
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
            return new UpdateRiskSettingsRequestDisabledReasonsItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateRiskSettingsRequestDisabledReasonsItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateRiskSettingsRequestDisabledReasonsItem ReadAsPropertyName(
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
            return new UpdateRiskSettingsRequestDisabledReasonsItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateRiskSettingsRequestDisabledReasonsItem value,
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
