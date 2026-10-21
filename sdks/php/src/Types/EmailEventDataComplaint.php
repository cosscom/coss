<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class EmailEventDataComplaint extends JsonSerializableType
{
    /**
     * @var ?string $feedbackType
     */
    #[JsonProperty('feedback_type')]
    public ?string $feedbackType;

    /**
     * @var ?string $subType
     */
    #[JsonProperty('sub_type')]
    public ?string $subType;

    /**
     * @param array{
     *   feedbackType?: ?string,
     *   subType?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->feedbackType = $values['feedbackType'] ?? null;
        if (array_key_exists('feedbackType', $values)) {
            $this->_setField('feedbackType');
        }
        $this->subType = $values['subType'] ?? null;
        if (array_key_exists('subType', $values)) {
            $this->_setField('subType');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
