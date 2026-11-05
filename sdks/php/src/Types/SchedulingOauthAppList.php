<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingOauthAppList extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingOauthAppListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<SchedulingOauthApp> $data
     */
    #[JsonProperty('data'), ArrayType([SchedulingOauthApp::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<SchedulingOauthAppListObject>,
     *   data: array<SchedulingOauthApp>,
     *   hasMore: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->data = $values['data'];
        $this->hasMore = $values['hasMore'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
