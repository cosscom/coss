<?php

namespace Coss\Scheduling\Settings\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateSchedulingSettingsRequestOutOfOfficeReasonsItem extends JsonSerializableType
{
    /**
     * @var string $key One of `unspecified`, `vacation`, `travel`, `sick`, `public_holiday`, `parental_leave`, `training` and `other`, or a key from the settings' `out_of_office_reasons`. Only people who manage this host see it: never bookers, webhooks or calendars.
     */
    #[JsonProperty('key')]
    public string $key;

    /**
     * @var string $label
     */
    #[JsonProperty('label')]
    public string $label;

    /**
     * @param array{
     *   key: string,
     *   label: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->key = $values['key'];
        $this->label = $values['label'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
