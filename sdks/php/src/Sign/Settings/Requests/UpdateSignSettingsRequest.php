<?php

namespace Coss\Sign\Settings\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Sign\Settings\Types\UpdateSignSettingsRequestTheme;

class UpdateSignSettingsRequest extends JsonSerializableType
{
    /**
     * @var ?array<string> $allowedOrigins
     */
    #[JsonProperty('allowed_origins'), ArrayType(['string'])]
    public ?array $allowedOrigins;

    /**
     * @var ?string $displayName
     */
    #[JsonProperty('display_name')]
    public ?string $displayName;

    /**
     * @var ?string $accentColor
     */
    #[JsonProperty('accent_color')]
    public ?string $accentColor;

    /**
     * @var ?value-of<UpdateSignSettingsRequestTheme> $theme
     */
    #[JsonProperty('theme')]
    public ?string $theme;

    /**
     * @var ?string $disclosure
     */
    #[JsonProperty('disclosure')]
    public ?string $disclosure;

    /**
     * @var ?string $emailFrom
     */
    #[JsonProperty('email_from')]
    public ?string $emailFrom;

    /**
     * @var ?int $reminderIntervalDays
     */
    #[JsonProperty('reminder_interval_days')]
    public ?int $reminderIntervalDays;

    /**
     * @param array{
     *   allowedOrigins?: ?array<string>,
     *   displayName?: ?string,
     *   accentColor?: ?string,
     *   theme?: ?value-of<UpdateSignSettingsRequestTheme>,
     *   disclosure?: ?string,
     *   emailFrom?: ?string,
     *   reminderIntervalDays?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->allowedOrigins = $values['allowedOrigins'] ?? null;
        if (array_key_exists('allowedOrigins', $values)) {
            $this->_setField('allowedOrigins');
        }
        $this->displayName = $values['displayName'] ?? null;
        if (array_key_exists('displayName', $values)) {
            $this->_setField('displayName');
        }
        $this->accentColor = $values['accentColor'] ?? null;
        if (array_key_exists('accentColor', $values)) {
            $this->_setField('accentColor');
        }
        $this->theme = $values['theme'] ?? null;
        if (array_key_exists('theme', $values)) {
            $this->_setField('theme');
        }
        $this->disclosure = $values['disclosure'] ?? null;
        if (array_key_exists('disclosure', $values)) {
            $this->_setField('disclosure');
        }
        $this->emailFrom = $values['emailFrom'] ?? null;
        if (array_key_exists('emailFrom', $values)) {
            $this->_setField('emailFrom');
        }
        $this->reminderIntervalDays = $values['reminderIntervalDays'] ?? null;
        if (array_key_exists('reminderIntervalDays', $values)) {
            $this->_setField('reminderIntervalDays');
        }
    }
}
