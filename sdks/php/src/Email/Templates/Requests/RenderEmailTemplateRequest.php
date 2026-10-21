<?php

namespace Coss\Email\Templates\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class RenderEmailTemplateRequest extends JsonSerializableType
{
    /**
     * @var ?int $version A published version to render. Default: the draft.
     */
    #[JsonProperty('version')]
    public ?int $version;

    /**
     * @var ?string $locale The locale to render, e.g. "pt-BR". Falls back to the language ("pt"), then to the default locale, as sends do.
     */
    #[JsonProperty('locale')]
    public ?string $locale;

    /**
     * @var ?array<string, mixed> $variables Values by variable name, checked as a send checks them. Default: `sample_variables`.
     */
    #[JsonProperty('variables'), ArrayType(['string' => 'mixed'])]
    public ?array $variables;

    /**
     * @param array{
     *   version?: ?int,
     *   locale?: ?string,
     *   variables?: ?array<string, mixed>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->version = $values['version'] ?? null;
        if (array_key_exists('version', $values)) {
            $this->_setField('version');
        }
        $this->locale = $values['locale'] ?? null;
        if (array_key_exists('locale', $values)) {
            $this->_setField('locale');
        }
        $this->variables = $values['variables'] ?? null;
        if (array_key_exists('variables', $values)) {
            $this->_setField('variables');
        }
    }
}
