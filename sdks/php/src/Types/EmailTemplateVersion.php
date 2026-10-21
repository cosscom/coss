<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class EmailTemplateVersion extends JsonSerializableType
{
    /**
     * @var value-of<EmailTemplateVersionObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $templateId
     */
    #[JsonProperty('template_id')]
    public string $templateId;

    /**
     * @var ?int $version The version number; `null` for the draft.
     */
    #[JsonProperty('version')]
    public ?int $version;

    /**
     * @var int $revision Counts the draft's saves. A published version keeps the revision it was published from.
     */
    #[JsonProperty('revision')]
    public int $revision;

    /**
     * @var string $defaultLocale
     */
    #[JsonProperty('default_locale')]
    public string $defaultLocale;

    /**
     * @var array<TemplateVariable> $variables
     */
    #[JsonProperty('variables'), ArrayType([TemplateVariable::class])]
    public array $variables;

    /**
     * @var array<string, mixed> $sampleVariables
     */
    #[JsonProperty('sample_variables'), ArrayType(['string' => 'mixed'])]
    public array $sampleVariables;

    /**
     * @var array<TemplateContent> $contents
     */
    #[JsonProperty('contents'), ArrayType([TemplateContent::class])]
    public array $contents;

    /**
     * @var array<TemplateProblem> $problems Syntax errors and undeclared variables per locale and field, which keep a draft from being published. Always empty for published versions.
     */
    #[JsonProperty('problems'), ArrayType([TemplateProblem::class])]
    public array $problems;

    /**
     * @var ?DateTime $publishedAt
     */
    #[JsonProperty('published_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $publishedAt;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var DateTime $updatedAt
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $updatedAt;

    /**
     * @param array{
     *   object: value-of<EmailTemplateVersionObject>,
     *   templateId: string,
     *   revision: int,
     *   defaultLocale: string,
     *   variables: array<TemplateVariable>,
     *   sampleVariables: array<string, mixed>,
     *   contents: array<TemplateContent>,
     *   problems: array<TemplateProblem>,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   version?: ?int,
     *   publishedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->templateId = $values['templateId'];
        $this->version = $values['version'] ?? null;
        $this->revision = $values['revision'];
        $this->defaultLocale = $values['defaultLocale'];
        $this->variables = $values['variables'];
        $this->sampleVariables = $values['sampleVariables'];
        $this->contents = $values['contents'];
        $this->problems = $values['problems'];
        $this->publishedAt = $values['publishedAt'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
