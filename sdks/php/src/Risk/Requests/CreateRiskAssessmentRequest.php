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
        $this->event = $values['event'];
        $this->eventName = $values['eventName'] ?? null;
        $this->user = $values['user'] ?? null;
        $this->ip = $values['ip'] ?? null;
        $this->userAgent = $values['userAgent'] ?? null;
        $this->captcha = $values['captcha'] ?? null;
        $this->checkout = $values['checkout'] ?? null;
        $this->device = $values['device'] ?? null;
        $this->content = $values['content'] ?? null;
    }
}
