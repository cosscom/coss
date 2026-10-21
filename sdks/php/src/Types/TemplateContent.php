<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class TemplateContent extends JsonSerializableType
{
    /**
     * @var string $locale
     */
    #[JsonProperty('locale')]
    public string $locale;

    /**
     * @var string $subject
     */
    #[JsonProperty('subject')]
    public string $subject;

    /**
     * @var ?string $html
     */
    #[JsonProperty('html')]
    public ?string $html;

    /**
     * @var ?string $text
     */
    #[JsonProperty('text')]
    public ?string $text;

    /**
     * @param array{
     *   locale: string,
     *   subject: string,
     *   html?: ?string,
     *   text?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->locale = $values['locale'];
        $this->subject = $values['subject'];
        $this->html = $values['html'] ?? null;
        $this->text = $values['text'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
