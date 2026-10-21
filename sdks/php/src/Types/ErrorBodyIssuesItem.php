<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class ErrorBodyIssuesItem extends JsonSerializableType
{
    /**
     * @var string $path Dot-separated field path, e.g. `to.1`.
     */
    #[JsonProperty('path')]
    public string $path;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @param array{
     *   path: string,
     *   message: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->path = $values['path'];
        $this->message = $values['message'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
