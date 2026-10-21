<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class RiskSettings extends JsonSerializableType
{
    /**
     * @var value-of<RiskSettingsObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var float $reviewThreshold Scores at or above it are `review`.
     */
    #[JsonProperty('review_threshold')]
    public float $reviewThreshold;

    /**
     * @var float $blockThreshold Scores at or above it are `block`.
     */
    #[JsonProperty('block_threshold')]
    public float $blockThreshold;

    /**
     * @var array<value-of<RiskSettingsDisabledReasonsItem>> $disabledReasons Reasons that never fire in this environment (they don't count in the score).
     */
    #[JsonProperty('disabled_reasons'), ArrayType(['string'])]
    public array $disabledReasons;

    /**
     * @var ?RiskSettingsCaptcha $captcha The captcha provider assessments verify tokens with (never the secret).
     */
    #[JsonProperty('captcha')]
    public ?RiskSettingsCaptcha $captcha;

    /**
     * @var RiskSettingsContentThresholds $contentThresholds Per content category, the score at which `content.<category>` fires; `null`: never (the score is still in `signals.content` for your rules).
     */
    #[JsonProperty('content_thresholds')]
    public RiskSettingsContentThresholds $contentThresholds;

    /**
     * @var RiskSettingsReasonWeights $reasonWeights Reasons whose weight this environment changed (from calibration or by hand); the rest weigh what the reason catalog says.
     */
    #[JsonProperty('reason_weights')]
    public RiskSettingsReasonWeights $reasonWeights;

    /**
     * @var ?DateTime $updatedAt `null` while on the defaults.
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $updatedAt;

    /**
     * @param array{
     *   object: value-of<RiskSettingsObject>,
     *   reviewThreshold: float,
     *   blockThreshold: float,
     *   disabledReasons: array<value-of<RiskSettingsDisabledReasonsItem>>,
     *   contentThresholds: RiskSettingsContentThresholds,
     *   reasonWeights: RiskSettingsReasonWeights,
     *   captcha?: ?RiskSettingsCaptcha,
     *   updatedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->reviewThreshold = $values['reviewThreshold'];
        $this->blockThreshold = $values['blockThreshold'];
        $this->disabledReasons = $values['disabledReasons'];
        $this->captcha = $values['captcha'] ?? null;
        $this->contentThresholds = $values['contentThresholds'];
        $this->reasonWeights = $values['reasonWeights'];
        $this->updatedAt = $values['updatedAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
