<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskReason extends JsonSerializableType
{
    /**
     * @var value-of<RiskReasonCode> $code
     */
    #[JsonProperty('code')]
    public string $code;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @var ?float $value The count behind a `velocity.*` reason, or the score behind a `content.*` one.
     */
    #[JsonProperty('value')]
    public ?float $value;

    /**
     * @var ?float $threshold What a `velocity.*` or `content.*` reason fires at.
     */
    #[JsonProperty('threshold')]
    public ?float $threshold;

    /**
     * @var ?value-of<RiskReasonWindow> $window
     */
    #[JsonProperty('window')]
    public ?string $window;

    /**
     * @var ?string $suggestion `email.typo`: the likely domain.
     */
    #[JsonProperty('suggestion')]
    public ?string $suggestion;

    /**
     * @var ?string $provider `ip.hosting_provider`, `ip.vpn_network`: the network's operator; `ip.vpn`: the VPN service.
     */
    #[JsonProperty('provider')]
    public ?string $provider;

    /**
     * @var ?string $previousUser `duplicate.canonical_mailbox`, `duplicate.device`: your id of the user who has the mailbox or device, if known.
     */
    #[JsonProperty('previous_user')]
    public ?string $previousUser;

    /**
     * @var ?string $previousAssessment `duplicate.canonical_mailbox`, `duplicate.device`: the assessment that first saw the mailbox or device.
     */
    #[JsonProperty('previous_assessment')]
    public ?string $previousAssessment;

    /**
     * @var ?string $entry `list.*`: the matching list entry.
     */
    #[JsonProperty('entry')]
    public ?string $entry;

    /**
     * @var ?string $rule `rule.matched`: the rule's id.
     */
    #[JsonProperty('rule')]
    public ?string $rule;

    /**
     * @var ?string $name `rule.matched`: the rule's name.
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?value-of<RiskReasonType> $type `list.*`: what matched.
     */
    #[JsonProperty('type')]
    public ?string $type;

    /**
     * @param array{
     *   code: value-of<RiskReasonCode>,
     *   message: string,
     *   value?: ?float,
     *   threshold?: ?float,
     *   window?: ?value-of<RiskReasonWindow>,
     *   suggestion?: ?string,
     *   provider?: ?string,
     *   previousUser?: ?string,
     *   previousAssessment?: ?string,
     *   entry?: ?string,
     *   rule?: ?string,
     *   name?: ?string,
     *   type?: ?value-of<RiskReasonType>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'];
        $this->message = $values['message'];
        $this->value = $values['value'] ?? null;
        $this->threshold = $values['threshold'] ?? null;
        $this->window = $values['window'] ?? null;
        $this->suggestion = $values['suggestion'] ?? null;
        $this->provider = $values['provider'] ?? null;
        $this->previousUser = $values['previousUser'] ?? null;
        $this->previousAssessment = $values['previousAssessment'] ?? null;
        $this->entry = $values['entry'] ?? null;
        $this->rule = $values['rule'] ?? null;
        $this->name = $values['name'] ?? null;
        $this->type = $values['type'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
