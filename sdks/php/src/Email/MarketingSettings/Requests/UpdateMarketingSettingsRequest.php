<?php

namespace Coss\Email\MarketingSettings\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateMarketingSettingsRequest extends JsonSerializableType
{
    /**
     * @var ?string $displayName
     */
    #[JsonProperty('display_name')]
    public ?string $displayName;

    /**
     * @var ?string $mailingAddress
     */
    #[JsonProperty('mailing_address')]
    public ?string $mailingAddress;

    /**
     * @var ?bool $doubleOptInDefault
     */
    #[JsonProperty('double_opt_in_default')]
    public ?bool $doubleOptInDefault;

    /**
     * @var ?string $confirmationFrom
     */
    #[JsonProperty('confirmation_from')]
    public ?string $confirmationFrom;

    /**
     * @var ?string $confirmationSubject
     */
    #[JsonProperty('confirmation_subject')]
    public ?string $confirmationSubject;

    /**
     * @var ?string $confirmationHtml
     */
    #[JsonProperty('confirmation_html')]
    public ?string $confirmationHtml;

    /**
     * @var ?string $confirmationText
     */
    #[JsonProperty('confirmation_text')]
    public ?string $confirmationText;

    /**
     * @var ?string $confirmedRedirectUrl
     */
    #[JsonProperty('confirmed_redirect_url')]
    public ?string $confirmedRedirectUrl;

    /**
     * @param array{
     *   displayName?: ?string,
     *   mailingAddress?: ?string,
     *   doubleOptInDefault?: ?bool,
     *   confirmationFrom?: ?string,
     *   confirmationSubject?: ?string,
     *   confirmationHtml?: ?string,
     *   confirmationText?: ?string,
     *   confirmedRedirectUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->displayName = $values['displayName'] ?? null;
        if (array_key_exists('displayName', $values)) {
            $this->_setField('displayName');
        }
        $this->mailingAddress = $values['mailingAddress'] ?? null;
        if (array_key_exists('mailingAddress', $values)) {
            $this->_setField('mailingAddress');
        }
        $this->doubleOptInDefault = $values['doubleOptInDefault'] ?? null;
        if (array_key_exists('doubleOptInDefault', $values)) {
            $this->_setField('doubleOptInDefault');
        }
        $this->confirmationFrom = $values['confirmationFrom'] ?? null;
        if (array_key_exists('confirmationFrom', $values)) {
            $this->_setField('confirmationFrom');
        }
        $this->confirmationSubject = $values['confirmationSubject'] ?? null;
        if (array_key_exists('confirmationSubject', $values)) {
            $this->_setField('confirmationSubject');
        }
        $this->confirmationHtml = $values['confirmationHtml'] ?? null;
        if (array_key_exists('confirmationHtml', $values)) {
            $this->_setField('confirmationHtml');
        }
        $this->confirmationText = $values['confirmationText'] ?? null;
        if (array_key_exists('confirmationText', $values)) {
            $this->_setField('confirmationText');
        }
        $this->confirmedRedirectUrl = $values['confirmedRedirectUrl'] ?? null;
        if (array_key_exists('confirmedRedirectUrl', $values)) {
            $this->_setField('confirmedRedirectUrl');
        }
    }
}
