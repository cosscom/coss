<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\RiskEvent;
use Coss\Core\Json\JsonProperty;
use Coss\Risk\Types\CreateRiskAssessmentRequestUser;
use Coss\Risk\Types\CreateRiskAssessmentRequestCaptcha;
use Coss\Types\RiskCheckoutRequest;
use Coss\Risk\Types\CreateRiskAssessmentRequestDevice;
use Coss\Risk\Types\CreateRiskAssessmentRequestContent;

class CreateRiskAssessmentRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original assessment instead of assessing (and counting) the event again, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var value-of<RiskEvent> $event
     */
    #[JsonProperty('event')]
    public string $event;

    /**
     * @var ?string $eventName Required for `custom` events (e.g. `invite_sent`), not allowed otherwise.
     */
    #[JsonProperty('event_name')]
    public ?string $eventName;

    /**
     * @var ?CreateRiskAssessmentRequestUser $user
     */
    #[JsonProperty('user')]
    public ?CreateRiskAssessmentRequestUser $user;

    /**
     * @var ?string $ip The client's IP address (not your server's or proxy's).
     */
    #[JsonProperty('ip')]
    public ?string $ip;

    /**
     * @var ?string $userAgent The client's user agent.
     */
    #[JsonProperty('user_agent')]
    public ?string $userAgent;

    /**
     * @var ?CreateRiskAssessmentRequestCaptcha $captcha
     */
    #[JsonProperty('captcha')]
    public ?CreateRiskAssessmentRequestCaptcha $captcha;

    /**
     * @var ?RiskCheckoutRequest $checkout
     */
    #[JsonProperty('checkout')]
    public ?RiskCheckoutRequest $checkout;

    /**
     * @var ?CreateRiskAssessmentRequestDevice $device The browser the event came from: recognizes it across accounts (`duplicate.device`, device velocity, fraud memory) and spots automation.
     */
    #[JsonProperty('device')]
    public ?CreateRiskAssessmentRequestDevice $device;

    /**
     * @var ?CreateRiskAssessmentRequestContent $content Content to classify with the event. Its scores go in `signals.content` and rules can test them; `content.*` reasons fire only at thresholds you set.
     */
    #[JsonProperty('content')]
    public ?CreateRiskAssessmentRequestContent $content;

    /**
     * @param array{
     *   event: value-of<RiskEvent>,
     *   idempotencyKey?: ?string,
     *   eventName?: ?string,
     *   user?: ?CreateRiskAssessmentRequestUser,
     *   ip?: ?string,
     *   userAgent?: ?string,
     *   captcha?: ?CreateRiskAssessmentRequestCaptcha,
     *   checkout?: ?RiskCheckoutRequest,
     *   device?: ?CreateRiskAssessmentRequestDevice,
     *   content?: ?CreateRiskAssessmentRequestContent,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        if (array_key_exists('idempotencyKey', $values)) {
            $this->_setField('idempotencyKey');
        }
        $this->event = $values['event'];
        $this->eventName = $values['eventName'] ?? null;
        if (array_key_exists('eventName', $values)) {
            $this->_setField('eventName');
        }
        $this->user = $values['user'] ?? null;
        if (array_key_exists('user', $values)) {
            $this->_setField('user');
        }
        $this->ip = $values['ip'] ?? null;
        if (array_key_exists('ip', $values)) {
            $this->_setField('ip');
        }
        $this->userAgent = $values['userAgent'] ?? null;
        if (array_key_exists('userAgent', $values)) {
            $this->_setField('userAgent');
        }
        $this->captcha = $values['captcha'] ?? null;
        if (array_key_exists('captcha', $values)) {
            $this->_setField('captcha');
        }
        $this->checkout = $values['checkout'] ?? null;
        if (array_key_exists('checkout', $values)) {
            $this->_setField('checkout');
        }
        $this->device = $values['device'] ?? null;
        if (array_key_exists('device', $values)) {
            $this->_setField('device');
        }
        $this->content = $values['content'] ?? null;
        if (array_key_exists('content', $values)) {
            $this->_setField('content');
        }
    }
}
