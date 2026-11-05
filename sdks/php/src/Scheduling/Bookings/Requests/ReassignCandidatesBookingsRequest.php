<?php

namespace Coss\Scheduling\Bookings\Requests;

use Coss\Core\Json\JsonSerializableType;

class ReassignCandidatesBookingsRequest extends JsonSerializableType
{
    /**
     * @var ?string $fromHost The host who'd leave, when it could be several.
     */
    public ?string $fromHost;

    /**
     * @param array{
     *   fromHost?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->fromHost = $values['fromHost'] ?? null;
        if (array_key_exists('fromHost', $values)) {
            $this->_setField('fromHost');
        }
    }
}
