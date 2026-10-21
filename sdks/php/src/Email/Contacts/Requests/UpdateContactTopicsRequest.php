<?php

namespace Coss\Email\Contacts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Contacts\Types\UpdateContactTopicsRequestTopicsItem;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class UpdateContactTopicsRequest extends JsonSerializableType
{
    /**
     * @var array<UpdateContactTopicsRequestTopicsItem> $topics
     */
    #[JsonProperty('topics'), ArrayType([UpdateContactTopicsRequestTopicsItem::class])]
    public array $topics;

    /**
     * @param array{
     *   topics: array<UpdateContactTopicsRequestTopicsItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->topics = $values['topics'];
    }
}
