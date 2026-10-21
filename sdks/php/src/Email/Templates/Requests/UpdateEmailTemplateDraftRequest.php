<?php

namespace Coss\Email\Templates\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Types\TemplateVariableInput;
use Coss\Core\Types\ArrayType;
use Coss\Types\TemplateContentInput;

class UpdateEmailTemplateDraftRequest extends JsonSerializableType
{
    /**
     * @var ?int $revision The draft `revision` you read. When given, the request is refused (`template_revision_mismatch`) if the draft changed since.
     */
    #[JsonProperty('revision')]
    public ?int $revision;

    /**
     * @var ?string $defaultLocale The locale sends fall back to when they ask for none, or for one without content. Defaults to the first entry of `contents` (or "en").
     */
    #[JsonProperty('default_locale')]
    public ?string $defaultLocale;

    /**
     * @var ?array<TemplateVariableInput> $variables The variables the template uses, with their types.
     */
    #[JsonProperty('variables'), ArrayType([TemplateVariableInput::class])]
    public ?array $variables;

    /**
     * @var ?array<string, mixed> $sampleVariables Example values for previews and test sends in the dashboard.
     */
    #[JsonProperty('sample_variables'), ArrayType(['string' => 'mixed'])]
    public ?array $sampleVariables;

    /**
     * @var ?array<TemplateContentInput> $contents The subject, HTML and text per locale.
     */
    #[JsonProperty('contents'), ArrayType([TemplateContentInput::class])]
    public ?array $contents;

    /**
     * @param array{
     *   revision?: ?int,
     *   defaultLocale?: ?string,
     *   variables?: ?array<TemplateVariableInput>,
     *   sampleVariables?: ?array<string, mixed>,
     *   contents?: ?array<TemplateContentInput>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->revision = $values['revision'] ?? null;
        $this->defaultLocale = $values['defaultLocale'] ?? null;
        $this->variables = $values['variables'] ?? null;
        $this->sampleVariables = $values['sampleVariables'] ?? null;
        $this->contents = $values['contents'] ?? null;
    }
}
