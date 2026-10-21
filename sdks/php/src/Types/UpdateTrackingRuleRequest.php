<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Fields left out keep their current value; a new rule starts with all off. A send's own `tracking` option still wins over the rule.
 */
class UpdateTrackingRuleRequest extends JsonSerializableType
{
    /**
     * @var ?bool $opens Track opens.
     */
    #[JsonProperty('opens')]
    public ?bool $opens;

    /**
     * @var ?bool $clicks Track clicks.
     */
    #[JsonProperty('clicks')]
    public ?bool $clicks;

    /**
     * @var ?bool $unsubscribe Add one-click unsubscribe headers to emails with a category and a single recipient.
     */
    #[JsonProperty('unsubscribe')]
    public ?bool $unsubscribe;

    /**
     * @param array{
     *   opens?: ?bool,
     *   clicks?: ?bool,
     *   unsubscribe?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->opens = $values['opens'] ?? null;
        if (array_key_exists('opens', $values)) {
            $this->_setField('opens');
        }
        $this->clicks = $values['clicks'] ?? null;
        if (array_key_exists('clicks', $values)) {
            $this->_setField('clicks');
        }
        $this->unsubscribe = $values['unsubscribe'] ?? null;
        if (array_key_exists('unsubscribe', $values)) {
            $this->_setField('unsubscribe');
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
