<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class RiskAssessmentSignals extends JsonSerializableType
{
    /**
     * @var ?RiskEmailSignals $email
     */
    #[JsonProperty('email')]
    public ?RiskEmailSignals $email;

    /**
     * @var ?RiskIpSignals $ip
     */
    #[JsonProperty('ip')]
    public ?RiskIpSignals $ip;

    /**
     * @var ?array<string, int> $velocity `null` when velocity was unavailable (see `degraded`).
     */
    #[JsonProperty('velocity'), ArrayType(['string' => 'integer'])]
    public ?array $velocity;

    /**
     * @var ?RiskCaptchaSignals $captcha
     */
    #[JsonProperty('captcha')]
    public ?RiskCaptchaSignals $captcha;

    /**
     * @var ?RiskLoginSignals $login
     */
    #[JsonProperty('login')]
    public ?RiskLoginSignals $login;

    /**
     * @var ?RiskContentSignals $content `null` when no content was given or it couldn't be classified.
     */
    #[JsonProperty('content')]
    public ?RiskContentSignals $content;

    /**
     * @var ?RiskCheckoutSignals $checkout
     */
    #[JsonProperty('checkout')]
    public ?RiskCheckoutSignals $checkout;

    /**
     * @var ?RiskDeviceSignals $device
     */
    #[JsonProperty('device')]
    public ?RiskDeviceSignals $device;

    /**
     * @param array{
     *   email?: ?RiskEmailSignals,
     *   ip?: ?RiskIpSignals,
     *   velocity?: ?array<string, int>,
     *   captcha?: ?RiskCaptchaSignals,
     *   login?: ?RiskLoginSignals,
     *   content?: ?RiskContentSignals,
     *   checkout?: ?RiskCheckoutSignals,
     *   device?: ?RiskDeviceSignals,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->email = $values['email'] ?? null;
        $this->ip = $values['ip'] ?? null;
        $this->velocity = $values['velocity'] ?? null;
        $this->captcha = $values['captcha'] ?? null;
        $this->login = $values['login'] ?? null;
        $this->content = $values['content'] ?? null;
        $this->checkout = $values['checkout'] ?? null;
        $this->device = $values['device'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
