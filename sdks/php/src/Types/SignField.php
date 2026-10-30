<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SignField extends JsonSerializableType
{
    /**
     * @var value-of<SignFieldObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $signerId
     */
    #[JsonProperty('signer_id')]
    public string $signerId;

    /**
     * @var string $documentId
     */
    #[JsonProperty('document_id')]
    public string $documentId;

    /**
     * @var value-of<SignFieldType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var int $page
     */
    #[JsonProperty('page')]
    public int $page;

    /**
     * @var float $x
     */
    #[JsonProperty('x')]
    public float $x;

    /**
     * @var float $y
     */
    #[JsonProperty('y')]
    public float $y;

    /**
     * @var float $width
     */
    #[JsonProperty('width')]
    public float $width;

    /**
     * @var float $height
     */
    #[JsonProperty('height')]
    public float $height;

    /**
     * @var bool $required
     */
    #[JsonProperty('required')]
    public bool $required;

    /**
     * @var ?string $label
     */
    #[JsonProperty('label')]
    public ?string $label;

    /**
     * @var ?string $anchor
     */
    #[JsonProperty('anchor')]
    public ?string $anchor;

    /**
     * @param array{
     *   object: value-of<SignFieldObject>,
     *   id: string,
     *   signerId: string,
     *   documentId: string,
     *   type: value-of<SignFieldType>,
     *   page: int,
     *   x: float,
     *   y: float,
     *   width: float,
     *   height: float,
     *   required: bool,
     *   label?: ?string,
     *   anchor?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->signerId = $values['signerId'];
        $this->documentId = $values['documentId'];
        $this->type = $values['type'];
        $this->page = $values['page'];
        $this->x = $values['x'];
        $this->y = $values['y'];
        $this->width = $values['width'];
        $this->height = $values['height'];
        $this->required = $values['required'];
        $this->label = $values['label'] ?? null;
        if (array_key_exists('label', $values)) {
            $this->_setField('label');
        }
        $this->anchor = $values['anchor'] ?? null;
        if (array_key_exists('anchor', $values)) {
            $this->_setField('anchor');
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
