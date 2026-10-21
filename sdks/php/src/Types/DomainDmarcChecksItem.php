<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class DomainDmarcChecksItem extends JsonSerializableType
{
    /**
     * @var value-of<DomainDmarcChecksItemId> $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var bool $ok
     */
    #[JsonProperty('ok')]
    public bool $ok;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @param array{
     *   id: value-of<DomainDmarcChecksItemId>,
     *   ok: bool,
     *   message: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->ok = $values['ok'];
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
