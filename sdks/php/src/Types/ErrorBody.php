<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class ErrorBody extends JsonSerializableType
{
    /**
     * @var value-of<ErrorBodyType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var string $code Machine-readable reason, e.g. `invalid_api_key`.
     */
    #[JsonProperty('code')]
    public string $code;

    /**
     * @var string $message Human-readable explanation. May change.
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @var ?string $param The request field or header the error relates to.
     */
    #[JsonProperty('param')]
    public ?string $param;

    /**
     * @var ?array<ErrorBodyIssuesItem> $issues Every problem: of the request (`validation_error`) or of a template (`invalid_template_variables`, `template_invalid`).
     */
    #[JsonProperty('issues'), ArrayType([ErrorBodyIssuesItem::class])]
    public ?array $issues;

    /**
     * @var string $requestId
     */
    #[JsonProperty('request_id')]
    public string $requestId;

    /**
     * @param array{
     *   type: value-of<ErrorBodyType>,
     *   code: string,
     *   message: string,
     *   requestId: string,
     *   param?: ?string,
     *   issues?: ?array<ErrorBodyIssuesItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->code = $values['code'];
        $this->message = $values['message'];
        $this->param = $values['param'] ?? null;
        if (array_key_exists('param', $values)) {
            $this->_setField('param');
        }
        $this->issues = $values['issues'] ?? null;
        if (array_key_exists('issues', $values)) {
            $this->_setField('issues');
        }
        $this->requestId = $values['requestId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
