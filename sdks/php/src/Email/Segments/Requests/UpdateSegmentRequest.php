<?php

namespace Coss\Email\Segments\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Types\SegmentFilter;

class UpdateSegmentRequest extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?SegmentFilter $filter
     */
    #[JsonProperty('filter')]
    public ?SegmentFilter $filter;

    /**
     * @param array{
     *   name?: ?string,
     *   filter?: ?SegmentFilter,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        $this->filter = $values['filter'] ?? null;
    }
}
