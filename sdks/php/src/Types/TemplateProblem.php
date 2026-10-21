<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class TemplateProblem extends JsonSerializableType
{
    /**
     * @var string $locale
     */
    #[JsonProperty('locale')]
    public string $locale;

    /**
     * @var value-of<TemplateProblemField> $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @var int $line
     */
    #[JsonProperty('line')]
    public int $line;

    /**
     * @var int $column
     */
    #[JsonProperty('column')]
    public int $column;

    /**
     * @param array{
     *   locale: string,
     *   field: value-of<TemplateProblemField>,
     *   message: string,
     *   line: int,
     *   column: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->locale = $values['locale'];
        $this->field = $values['field'];
        $this->message = $values['message'];
        $this->line = $values['line'];
        $this->column = $values['column'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
