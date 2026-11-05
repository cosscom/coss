<?php

namespace Coss\Scheduling\OutOfOffice\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListOutOfOfficeRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit
     */
    public ?int $limit;

    /**
     * @var ?string $after The last id of the previous page.
     */
    public ?string $after;

    /**
     * @var ?string $host One host's entries, by id or uid.
     */
    public ?string $host;

    /**
     * @var ?string $startAfter Entries ending after this.
     */
    public ?string $startAfter;

    /**
     * @var ?string $startBefore Entries starting before this.
     */
    public ?string $startBefore;

    /**
     * @var ?string $group The entries one request made.
     */
    public ?string $group;

    /**
     * @param array{
     *   limit?: ?int,
     *   after?: ?string,
     *   host?: ?string,
     *   startAfter?: ?string,
     *   startBefore?: ?string,
     *   group?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
        $this->host = $values['host'] ?? null;
        if (array_key_exists('host', $values)) {
            $this->_setField('host');
        }
        $this->startAfter = $values['startAfter'] ?? null;
        if (array_key_exists('startAfter', $values)) {
            $this->_setField('startAfter');
        }
        $this->startBefore = $values['startBefore'] ?? null;
        if (array_key_exists('startBefore', $values)) {
            $this->_setField('startBefore');
        }
        $this->group = $values['group'] ?? null;
        if (array_key_exists('group', $values)) {
            $this->_setField('group');
        }
    }
}
