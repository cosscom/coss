<?php

namespace Coss\Email\Templates\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class PublishEmailTemplateRequest extends JsonSerializableType
{
    /**
     * @var ?int $revision The draft `revision` you read. When given, the request is refused (`template_revision_mismatch`) if the draft changed since.
     */
    #[JsonProperty('revision')]
    public ?int $revision;

    /**
     * @param array{
     *   revision?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->revision = $values['revision'] ?? null;
    }
}
