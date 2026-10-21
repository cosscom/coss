<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Overrides the environment's tracking settings (its default, or the rule for this email's category) for this email. Omitted fields keep the configured setting.
 */
class TrackingOptions extends JsonSerializableType
{
    /**
     * @var ?bool $opens Add an invisible pixel to the HTML body and record `email.opened` events.
     */
    #[JsonProperty('opens')]
    public ?bool $opens;

    /**
     * @var ?bool $clicks Send HTML links through a coss.com redirect and record `email.clicked` events. Links with a `data-coss-no-track` attribute are left alone.
     */
    #[JsonProperty('clicks')]
    public ?bool $clicks;

    /**
     * @var ?bool $unsubscribe Add one-click unsubscribe headers (`List-Unsubscribe` and `List-Unsubscribe-Post`, RFC 8058). An unsubscribe suppresses the recipient for this email's category and records `email.unsubscribed`. Needs a `category`, a single recipient, no `List-Unsubscribe` header of your own and at most 13 custom headers.
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
