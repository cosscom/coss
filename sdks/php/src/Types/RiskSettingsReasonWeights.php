<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Reasons whose weight this environment changed (from calibration or by hand); the rest weigh what the reason catalog says.
 */
class RiskSettingsReasonWeights extends JsonSerializableType
{
    /**
     * @var ?float $emailInvalid
     */
    #[JsonProperty('email.invalid')]
    public ?float $emailInvalid;

    /**
     * @var ?float $emailDisposable
     */
    #[JsonProperty('email.disposable')]
    public ?float $emailDisposable;

    /**
     * @var ?float $emailUndeliverable
     */
    #[JsonProperty('email.undeliverable')]
    public ?float $emailUndeliverable;

    /**
     * @var ?float $emailRoleAccount
     */
    #[JsonProperty('email.role_account')]
    public ?float $emailRoleAccount;

    /**
     * @var ?float $emailTypo
     */
    #[JsonProperty('email.typo')]
    public ?float $emailTypo;

    /**
     * @var ?float $emailDomainNew
     */
    #[JsonProperty('email.domain_new')]
    public ?float $emailDomainNew;

    /**
     * @var ?float $ipTor
     */
    #[JsonProperty('ip.tor')]
    public ?float $ipTor;

    /**
     * @var ?float $ipVpnNetwork
     */
    #[JsonProperty('ip.vpn_network')]
    public ?float $ipVpnNetwork;

    /**
     * @var ?float $ipHostingProvider
     */
    #[JsonProperty('ip.hosting_provider')]
    public ?float $ipHostingProvider;

    /**
     * @var ?float $ipVpn
     */
    #[JsonProperty('ip.vpn')]
    public ?float $ipVpn;

    /**
     * @var ?float $ipProxy
     */
    #[JsonProperty('ip.proxy')]
    public ?float $ipProxy;

    /**
     * @var ?float $ipRelay
     */
    #[JsonProperty('ip.relay')]
    public ?float $ipRelay;

    /**
     * @var ?float $ipPrivate
     */
    #[JsonProperty('ip.private')]
    public ?float $ipPrivate;

    /**
     * @var ?float $velocitySignupsPerIp1H
     */
    #[JsonProperty('velocity.signups_per_ip_1h')]
    public ?float $velocitySignupsPerIp1H;

    /**
     * @var ?float $velocitySignupsPerIp24H
     */
    #[JsonProperty('velocity.signups_per_ip_24h')]
    public ?float $velocitySignupsPerIp24H;

    /**
     * @var ?float $velocitySignupsPerSubnet1H
     */
    #[JsonProperty('velocity.signups_per_subnet_1h')]
    public ?float $velocitySignupsPerSubnet1H;

    /**
     * @var ?float $velocitySignupsPerEmailDomain1H
     */
    #[JsonProperty('velocity.signups_per_email_domain_1h')]
    public ?float $velocitySignupsPerEmailDomain1H;

    /**
     * @var ?float $velocitySignupsPerMailbox24H
     */
    #[JsonProperty('velocity.signups_per_mailbox_24h')]
    public ?float $velocitySignupsPerMailbox24H;

    /**
     * @var ?float $velocitySignupsPerDevice24H
     */
    #[JsonProperty('velocity.signups_per_device_24h')]
    public ?float $velocitySignupsPerDevice24H;

    /**
     * @var ?float $velocityCheckoutsPerIp1H
     */
    #[JsonProperty('velocity.checkouts_per_ip_1h')]
    public ?float $velocityCheckoutsPerIp1H;

    /**
     * @var ?float $velocityCheckoutsPerUser1H
     */
    #[JsonProperty('velocity.checkouts_per_user_1h')]
    public ?float $velocityCheckoutsPerUser1H;

    /**
     * @var ?float $velocityCheckoutsPerCard24H
     */
    #[JsonProperty('velocity.checkouts_per_card_24h')]
    public ?float $velocityCheckoutsPerCard24H;

    /**
     * @var ?float $velocityLoginsPerIp1H
     */
    #[JsonProperty('velocity.logins_per_ip_1h')]
    public ?float $velocityLoginsPerIp1H;

    /**
     * @var ?float $velocityLoginsPerUser1H
     */
    #[JsonProperty('velocity.logins_per_user_1h')]
    public ?float $velocityLoginsPerUser1H;

    /**
     * @var ?float $velocityEventsPerIp1H
     */
    #[JsonProperty('velocity.events_per_ip_1h')]
    public ?float $velocityEventsPerIp1H;

    /**
     * @var ?float $velocityEventsPerUser1H
     */
    #[JsonProperty('velocity.events_per_user_1h')]
    public ?float $velocityEventsPerUser1H;

    /**
     * @var ?float $duplicateCanonicalMailbox
     */
    #[JsonProperty('duplicate.canonical_mailbox')]
    public ?float $duplicateCanonicalMailbox;

    /**
     * @var ?float $duplicateDevice
     */
    #[JsonProperty('duplicate.device')]
    public ?float $duplicateDevice;

    /**
     * @var ?float $historyFraudMailbox
     */
    #[JsonProperty('history.fraud_mailbox')]
    public ?float $historyFraudMailbox;

    /**
     * @var ?float $historyFraudUser
     */
    #[JsonProperty('history.fraud_user')]
    public ?float $historyFraudUser;

    /**
     * @var ?float $historyFraudIp
     */
    #[JsonProperty('history.fraud_ip')]
    public ?float $historyFraudIp;

    /**
     * @var ?float $historyFraudSubnet
     */
    #[JsonProperty('history.fraud_subnet')]
    public ?float $historyFraudSubnet;

    /**
     * @var ?float $historyFraudCard
     */
    #[JsonProperty('history.fraud_card')]
    public ?float $historyFraudCard;

    /**
     * @var ?float $historyFraudDevice
     */
    #[JsonProperty('history.fraud_device')]
    public ?float $historyFraudDevice;

    /**
     * @var ?float $checkoutCardCountryMismatch
     */
    #[JsonProperty('checkout.card_country_mismatch')]
    public ?float $checkoutCardCountryMismatch;

    /**
     * @var ?float $checkoutBillingCountryMismatch
     */
    #[JsonProperty('checkout.billing_country_mismatch')]
    public ?float $checkoutBillingCountryMismatch;

    /**
     * @var ?float $checkoutPrepaidCard
     */
    #[JsonProperty('checkout.prepaid_card')]
    public ?float $checkoutPrepaidCard;

    /**
     * @var ?float $deviceAutomation
     */
    #[JsonProperty('device.automation')]
    public ?float $deviceAutomation;

    /**
     * @var ?float $deviceInvalid
     */
    #[JsonProperty('device.invalid')]
    public ?float $deviceInvalid;

    /**
     * @var ?float $loginNewCountry
     */
    #[JsonProperty('login.new_country')]
    public ?float $loginNewCountry;

    /**
     * @var ?float $loginNewNetwork
     */
    #[JsonProperty('login.new_network')]
    public ?float $loginNewNetwork;

    /**
     * @var ?float $captchaFailed
     */
    #[JsonProperty('captcha.failed')]
    public ?float $captchaFailed;

    /**
     * @var ?float $captchaMissing
     */
    #[JsonProperty('captcha.missing')]
    public ?float $captchaMissing;

    /**
     * @var ?float $contentSpam
     */
    #[JsonProperty('content.spam')]
    public ?float $contentSpam;

    /**
     * @var ?float $contentPhishing
     */
    #[JsonProperty('content.phishing')]
    public ?float $contentPhishing;

    /**
     * @var ?float $contentMalware
     */
    #[JsonProperty('content.malware')]
    public ?float $contentMalware;

    /**
     * @var ?float $contentFraud
     */
    #[JsonProperty('content.fraud')]
    public ?float $contentFraud;

    /**
     * @param array{
     *   emailInvalid?: ?float,
     *   emailDisposable?: ?float,
     *   emailUndeliverable?: ?float,
     *   emailRoleAccount?: ?float,
     *   emailTypo?: ?float,
     *   emailDomainNew?: ?float,
     *   ipTor?: ?float,
     *   ipVpnNetwork?: ?float,
     *   ipHostingProvider?: ?float,
     *   ipVpn?: ?float,
     *   ipProxy?: ?float,
     *   ipRelay?: ?float,
     *   ipPrivate?: ?float,
     *   velocitySignupsPerIp1H?: ?float,
     *   velocitySignupsPerIp24H?: ?float,
     *   velocitySignupsPerSubnet1H?: ?float,
     *   velocitySignupsPerEmailDomain1H?: ?float,
     *   velocitySignupsPerMailbox24H?: ?float,
     *   velocitySignupsPerDevice24H?: ?float,
     *   velocityCheckoutsPerIp1H?: ?float,
     *   velocityCheckoutsPerUser1H?: ?float,
     *   velocityCheckoutsPerCard24H?: ?float,
     *   velocityLoginsPerIp1H?: ?float,
     *   velocityLoginsPerUser1H?: ?float,
     *   velocityEventsPerIp1H?: ?float,
     *   velocityEventsPerUser1H?: ?float,
     *   duplicateCanonicalMailbox?: ?float,
     *   duplicateDevice?: ?float,
     *   historyFraudMailbox?: ?float,
     *   historyFraudUser?: ?float,
     *   historyFraudIp?: ?float,
     *   historyFraudSubnet?: ?float,
     *   historyFraudCard?: ?float,
     *   historyFraudDevice?: ?float,
     *   checkoutCardCountryMismatch?: ?float,
     *   checkoutBillingCountryMismatch?: ?float,
     *   checkoutPrepaidCard?: ?float,
     *   deviceAutomation?: ?float,
     *   deviceInvalid?: ?float,
     *   loginNewCountry?: ?float,
     *   loginNewNetwork?: ?float,
     *   captchaFailed?: ?float,
     *   captchaMissing?: ?float,
     *   contentSpam?: ?float,
     *   contentPhishing?: ?float,
     *   contentMalware?: ?float,
     *   contentFraud?: ?float,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->emailInvalid = $values['emailInvalid'] ?? null;
        $this->emailDisposable = $values['emailDisposable'] ?? null;
        $this->emailUndeliverable = $values['emailUndeliverable'] ?? null;
        $this->emailRoleAccount = $values['emailRoleAccount'] ?? null;
        $this->emailTypo = $values['emailTypo'] ?? null;
        $this->emailDomainNew = $values['emailDomainNew'] ?? null;
        $this->ipTor = $values['ipTor'] ?? null;
        $this->ipVpnNetwork = $values['ipVpnNetwork'] ?? null;
        $this->ipHostingProvider = $values['ipHostingProvider'] ?? null;
        $this->ipVpn = $values['ipVpn'] ?? null;
        $this->ipProxy = $values['ipProxy'] ?? null;
        $this->ipRelay = $values['ipRelay'] ?? null;
        $this->ipPrivate = $values['ipPrivate'] ?? null;
        $this->velocitySignupsPerIp1H = $values['velocitySignupsPerIp1H'] ?? null;
        $this->velocitySignupsPerIp24H = $values['velocitySignupsPerIp24H'] ?? null;
        $this->velocitySignupsPerSubnet1H = $values['velocitySignupsPerSubnet1H'] ?? null;
        $this->velocitySignupsPerEmailDomain1H = $values['velocitySignupsPerEmailDomain1H'] ?? null;
        $this->velocitySignupsPerMailbox24H = $values['velocitySignupsPerMailbox24H'] ?? null;
        $this->velocitySignupsPerDevice24H = $values['velocitySignupsPerDevice24H'] ?? null;
        $this->velocityCheckoutsPerIp1H = $values['velocityCheckoutsPerIp1H'] ?? null;
        $this->velocityCheckoutsPerUser1H = $values['velocityCheckoutsPerUser1H'] ?? null;
        $this->velocityCheckoutsPerCard24H = $values['velocityCheckoutsPerCard24H'] ?? null;
        $this->velocityLoginsPerIp1H = $values['velocityLoginsPerIp1H'] ?? null;
        $this->velocityLoginsPerUser1H = $values['velocityLoginsPerUser1H'] ?? null;
        $this->velocityEventsPerIp1H = $values['velocityEventsPerIp1H'] ?? null;
        $this->velocityEventsPerUser1H = $values['velocityEventsPerUser1H'] ?? null;
        $this->duplicateCanonicalMailbox = $values['duplicateCanonicalMailbox'] ?? null;
        $this->duplicateDevice = $values['duplicateDevice'] ?? null;
        $this->historyFraudMailbox = $values['historyFraudMailbox'] ?? null;
        $this->historyFraudUser = $values['historyFraudUser'] ?? null;
        $this->historyFraudIp = $values['historyFraudIp'] ?? null;
        $this->historyFraudSubnet = $values['historyFraudSubnet'] ?? null;
        $this->historyFraudCard = $values['historyFraudCard'] ?? null;
        $this->historyFraudDevice = $values['historyFraudDevice'] ?? null;
        $this->checkoutCardCountryMismatch = $values['checkoutCardCountryMismatch'] ?? null;
        $this->checkoutBillingCountryMismatch = $values['checkoutBillingCountryMismatch'] ?? null;
        $this->checkoutPrepaidCard = $values['checkoutPrepaidCard'] ?? null;
        $this->deviceAutomation = $values['deviceAutomation'] ?? null;
        $this->deviceInvalid = $values['deviceInvalid'] ?? null;
        $this->loginNewCountry = $values['loginNewCountry'] ?? null;
        $this->loginNewNetwork = $values['loginNewNetwork'] ?? null;
        $this->captchaFailed = $values['captchaFailed'] ?? null;
        $this->captchaMissing = $values['captchaMissing'] ?? null;
        $this->contentSpam = $values['contentSpam'] ?? null;
        $this->contentPhishing = $values['contentPhishing'] ?? null;
        $this->contentMalware = $values['contentMalware'] ?? null;
        $this->contentFraud = $values['contentFraud'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
