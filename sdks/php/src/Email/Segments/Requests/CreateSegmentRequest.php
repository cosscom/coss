<?php

namespace Coss\Email\Segments\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Types\SegmentFilter;

class CreateSegmentRequest extends JsonSerializableType
{
    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var SegmentFilter $filter
     */
    #[JsonProperty('filter')]
    public SegmentFilter $filter;

    /**
     * @param array{
     *   name: string,
     *   filter: SegmentFilter,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->filter = $values['filter'];
    }
}
