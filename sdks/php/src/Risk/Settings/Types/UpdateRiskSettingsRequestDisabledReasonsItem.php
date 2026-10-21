<?php

namespace Coss\Risk\Settings\Types;

enum UpdateRiskSettingsRequestDisabledReasonsItem: string
{
    case EmailInvalid = "email.invalid";
    case EmailDisposable = "email.disposable";
    case EmailUndeliverable = "email.undeliverable";
    case EmailRoleAccount = "email.role_account";
    case EmailTypo = "email.typo";
    case EmailDomainNew = "email.domain_new";
    case IpTor = "ip.tor";
    case IpVpnNetwork = "ip.vpn_network";
    case IpHostingProvider = "ip.hosting_provider";
    case IpVpn = "ip.vpn";
    case IpProxy = "ip.proxy";
    case IpRelay = "ip.relay";
    case IpPrivate = "ip.private";
    case VelocitySignupsPerIp1H = "velocity.signups_per_ip_1h";
    case VelocitySignupsPerIp24H = "velocity.signups_per_ip_24h";
    case VelocitySignupsPerSubnet1H = "velocity.signups_per_subnet_1h";
    case VelocitySignupsPerEmailDomain1H = "velocity.signups_per_email_domain_1h";
    case VelocitySignupsPerMailbox24H = "velocity.signups_per_mailbox_24h";
    case VelocitySignupsPerDevice24H = "velocity.signups_per_device_24h";
    case VelocityCheckoutsPerIp1H = "velocity.checkouts_per_ip_1h";
    case VelocityCheckoutsPerUser1H = "velocity.checkouts_per_user_1h";
    case VelocityCheckoutsPerCard24H = "velocity.checkouts_per_card_24h";
    case VelocityLoginsPerIp1H = "velocity.logins_per_ip_1h";
    case VelocityLoginsPerUser1H = "velocity.logins_per_user_1h";
    case VelocityEventsPerIp1H = "velocity.events_per_ip_1h";
    case VelocityEventsPerUser1H = "velocity.events_per_user_1h";
    case DuplicateCanonicalMailbox = "duplicate.canonical_mailbox";
    case DuplicateDevice = "duplicate.device";
    case HistoryFraudMailbox = "history.fraud_mailbox";
    case HistoryFraudUser = "history.fraud_user";
    case HistoryFraudIp = "history.fraud_ip";
    case HistoryFraudSubnet = "history.fraud_subnet";
    case HistoryFraudCard = "history.fraud_card";
    case HistoryFraudDevice = "history.fraud_device";
    case CheckoutCardCountryMismatch = "checkout.card_country_mismatch";
    case CheckoutBillingCountryMismatch = "checkout.billing_country_mismatch";
    case CheckoutPrepaidCard = "checkout.prepaid_card";
    case DeviceAutomation = "device.automation";
    case DeviceInvalid = "device.invalid";
    case LoginNewCountry = "login.new_country";
    case LoginNewNetwork = "login.new_network";
    case CaptchaFailed = "captcha.failed";
    case CaptchaMissing = "captcha.missing";
}
