<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * What the browser reported through `coss/device` (its device id is only kept as a keyed hash).
 */
class RiskDeviceSignals extends JsonSerializableType
{
    /**
     * @var bool $valid `false`: the token was malformed or too old.
     */
    #[JsonProperty('valid')]
    public bool $valid;

    /**
     * @var bool $automation WebDriver control or a headless browser.
     */
    #[JsonProperty('automation')]
    public bool $automation;

    /**
     * @var ?string $timezone IANA time zone (`Europe/London`).
     */
    #[JsonProperty('timezone')]
    public ?string $timezone;

    /**
     * @var ?string $language The browser's first language.
     */
    #[JsonProperty('language')]
    public ?string $language;

    /**
     * @var ?string $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var ?string $screen `<width>x<height>` in CSS pixels.
     */
    #[JsonProperty('screen')]
    public ?string $screen;

    /**
     * @var ?bool $touch
     */
    #[JsonProperty('touch')]
    public ?bool $touch;

    /**
     * @param array{
     *   valid: bool,
     *   automation: bool,
     *   timezone?: ?string,
     *   language?: ?string,
     *   platform?: ?string,
     *   screen?: ?string,
     *   touch?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->valid = $values['valid'];
        $this->automation = $values['automation'];
        $this->timezone = $values['timezone'] ?? null;
        $this->language = $values['language'] ?? null;
        $this->platform = $values['platform'] ?? null;
        $this->screen = $values['screen'] ?? null;
        $this->touch = $values['touch'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
