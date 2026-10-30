<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class FormSpam extends JsonSerializableType
{
    /**
     * @var string $honeypotField
     */
    #[JsonProperty('honeypot_field')]
    public string $honeypotField;

    /**
     * @var value-of<FormSpamCaptcha> $captcha
     */
    #[JsonProperty('captcha')]
    public string $captcha;

    /**
     * @var ?string $captchaSiteKey
     */
    #[JsonProperty('captcha_site_key')]
    public ?string $captchaSiteKey;

    /**
     * @var ?float $contentThreshold
     */
    #[JsonProperty('content_threshold')]
    public ?float $contentThreshold;

    /**
     * @var value-of<FormSpamOnReview> $onReview
     */
    #[JsonProperty('on_review')]
    public string $onReview;

    /**
     * @param array{
     *   honeypotField: string,
     *   captcha: value-of<FormSpamCaptcha>,
     *   onReview: value-of<FormSpamOnReview>,
     *   captchaSiteKey?: ?string,
     *   contentThreshold?: ?float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->honeypotField = $values['honeypotField'];
        $this->captcha = $values['captcha'];
        $this->captchaSiteKey = $values['captchaSiteKey'] ?? null;
        if (array_key_exists('captchaSiteKey', $values)) {
            $this->_setField('captchaSiteKey');
        }
        $this->contentThreshold = $values['contentThreshold'] ?? null;
        if (array_key_exists('contentThreshold', $values)) {
            $this->_setField('contentThreshold');
        }
        $this->onReview = $values['onReview'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
