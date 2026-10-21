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
        $this->mailingAddress = $values['mailingAddress'] ?? null;
        $this->doubleOptInDefault = $values['doubleOptInDefault'] ?? null;
        $this->confirmationFrom = $values['confirmationFrom'] ?? null;
        $this->confirmationSubject = $values['confirmationSubject'] ?? null;
        $this->confirmationHtml = $values['confirmationHtml'] ?? null;
        $this->confirmationText = $values['confirmationText'] ?? null;
        $this->confirmedRedirectUrl = $values['confirmedRedirectUrl'] ?? null;
    }
}
