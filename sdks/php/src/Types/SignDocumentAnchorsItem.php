<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * A text anchor found in the document, in points from the page's top left.
 */
class SignDocumentAnchorsItem extends JsonSerializableType
{
    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

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
     * @param array{
     *   text: string,
     *   page: int,
     *   x: float,
     *   y: float,
     *   width: float,
     *   height: float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->text = $values['text'];
        $this->page = $values['page'];
        $this->x = $values['x'];
        $this->y = $values['y'];
        $this->width = $values['width'];
        $this->height = $values['height'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
