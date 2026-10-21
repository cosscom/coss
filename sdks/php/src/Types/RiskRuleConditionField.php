<?php

namespace Coss\Types;

enum RiskRuleConditionField: string
{
    case EmailValid = "email.valid";
    case EmailDisposable = "email.disposable";
    case EmailUndeliverable = "email.undeliverable";
    case EmailRoleAccount = "email.role_account";
    case EmailFreeProvider = "email.free_provider";
    case EmailTypo = "email.typo";
    case EmailDomainNew = "email.domain_new";
    case EmailDomain = "email.domain";
    case EmailDomainAgeDays = "email.domain_age_days";
    case IpTor = "ip.tor";
    case IpHosting = "ip.hosting";
    case IpVpn = "ip.vpn";
    case IpProxy = "ip.proxy";
    case IpRelay = "ip.relay";
    case IpPrivate = "ip.private";
    case IpCountry = "ip.country";
    case IpAsn = "ip.asn";
    case IpHostingProvider = "ip.hosting_provider";
    case CaptchaPassed = "captcha.passed";
    case DuplicateCanonicalMailbox = "duplicate.canonical_mailbox";
    case DuplicateDevice = "duplicate.device";
    case HistoryFraud = "history.fraud";
    case LoginNewCountry = "login.new_country";
    case LoginNewNetwork = "login.new_network";
    case ContentSpam = "content.spam";
    case ContentPhishing = "content.phishing";
    case ContentMalware = "content.malware";
    case ContentFraud = "content.fraud";
    case CheckoutAmount = "checkout.amount";
    case CheckoutCurrency = "checkout.currency";
    case CheckoutCardCountry = "checkout.card_country";
    case CheckoutCardFunding = "checkout.card_funding";
    case CheckoutBillingCountry = "checkout.billing_country";
    case CheckoutShippingCountry = "checkout.shipping_country";
    case DeviceAutomation = "device.automation";
    case DeviceTimezone = "device.timezone";
    case DeviceLanguage = "device.language";
    case Score = "score";
    case VelocityIp1H = "velocity.ip_1h";
    case VelocityIp24H = "velocity.ip_24h";
    case VelocitySubnet1H = "velocity.subnet_1h";
    case VelocitySubnet24H = "velocity.subnet_24h";
    case VelocityEmailDomain1H = "velocity.email_domain_1h";
    case VelocityEmailDomain24H = "velocity.email_domain_24h";
    case VelocityMailbox1H = "velocity.mailbox_1h";
    case VelocityMailbox24H = "velocity.mailbox_24h";
    case VelocityUser1H = "velocity.user_1h";
    case VelocityUser24H = "velocity.user_24h";
    case VelocityCard1H = "velocity.card_1h";
    case VelocityCard24H = "velocity.card_24h";
    case VelocityDevice1H = "velocity.device_1h";
    case VelocityDevice24H = "velocity.device_24h";
}
