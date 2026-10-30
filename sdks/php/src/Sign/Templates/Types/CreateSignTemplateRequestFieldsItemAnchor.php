<?php

namespace Coss\Sign\Templates\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateSignTemplateRequestFieldsItemAnchor extends JsonSerializableType
{
    /**
     * @var value-of<CreateSignTemplateRequestFieldsItemAnchorType> $type `signature` and `initials` take the signer's adopted signature, `date_signed` is filled with the signing date, `name` and `email` with the signer's, `text` and `checkbox` by the signer.
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?bool $required Default `true`. A signer can't finish with a required field empty.
     */
    #[JsonProperty('required')]
    public ?bool $required;

    /**
     * @var ?string $label Shown to the signer.
     */
    #[JsonProperty('label')]
    public ?string $label;

    /**
     * @var string $anchor Place the field over every occurrence of this text in the documents (e.g. `{{signature:signer_1}}`).
     */
    #[JsonProperty('anchor')]
    public string $anchor;

    /**
     * @var ?float $width Default: the anchor text's width.
     */
    #[JsonProperty('width')]
    public ?float $width;

    /**
     * @var ?float $height Default: the anchor text's height.
     */
    #[JsonProperty('height')]
    public ?float $height;

    /**
     * @var ?float $offsetX Points to move it right.
     */
    #[JsonProperty('offset_x')]
    public ?float $offsetX;

    /**
     * @var ?float $offsetY Points to move it down.
     */
    #[JsonProperty('offset_y')]
    public ?float $offsetY;

    /**
     * @var string $role The role's key, e.g. `client`.
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @var ?string $mergeKey `text` fields only: filled from the request's `merge_fields[merge_key]` (shown to the signer, not editable). Without a value, the signer fills it.
     */
    #[JsonProperty('merge_key')]
    public ?string $mergeKey;

    /**
     * @param array{
     *   type: value-of<CreateSignTemplateRequestFieldsItemAnchorType>,
     *   anchor: string,
     *   role: string,
     *   required?: ?bool,
     *   label?: ?string,
     *   width?: ?float,
     *   height?: ?float,
     *   offsetX?: ?float,
     *   offsetY?: ?float,
     *   mergeKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->required = $values['required'] ?? null;
        if (array_key_exists('required', $values)) {
            $this->_setField('required');
        }
        $this->label = $values['label'] ?? null;
        if (array_key_exists('label', $values)) {
            $this->_setField('label');
        }
        $this->anchor = $values['anchor'];
        $this->width = $values['width'] ?? null;
        if (array_key_exists('width', $values)) {
            $this->_setField('width');
        }
        $this->height = $values['height'] ?? null;
        if (array_key_exists('height', $values)) {
            $this->_setField('height');
        }
        $this->offsetX = $values['offsetX'] ?? null;
        if (array_key_exists('offsetX', $values)) {
            $this->_setField('offsetX');
        }
        $this->offsetY = $values['offsetY'] ?? null;
        if (array_key_exists('offsetY', $values)) {
            $this->_setField('offsetY');
        }
        $this->role = $values['role'];
        $this->mergeKey = $values['mergeKey'] ?? null;
        if (array_key_exists('mergeKey', $values)) {
            $this->_setField('mergeKey');
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
