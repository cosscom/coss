<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class TemplateContentInput extends JsonSerializableType
{
    /**
     * @var string $locale A BCP 47 language tag, e.g. "en" or "pt-BR".
     */
    #[JsonProperty('locale')]
    public string $locale;

    /**
     * @var string $subject The subject template.
     */
    #[JsonProperty('subject')]
    public string $subject;

    /**
     * @var ?string $html The HTML template. Provide `html`, `text`, or both.
     */
    #[JsonProperty('html')]
    public ?string $html;

    /**
     * @var ?string $text The plain-text template.
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
