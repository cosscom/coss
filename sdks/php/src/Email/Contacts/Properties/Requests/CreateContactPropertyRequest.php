<?php

namespace Coss\Email\Contacts\Properties\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Email\Contacts\Properties\Types\CreateContactPropertyRequestType;
use Coss\Core\Types\Union;

class CreateContactPropertyRequest extends JsonSerializableType
{
    /**
     * @var string $key
     */
    #[JsonProperty('key')]
    public string $key;

    /**
     * @var value-of<CreateContactPropertyRequestType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var (
     *    string
     *   |float
     *   |bool
     * )|null $fallback
     */
    #[JsonProperty('fallback'), Union('string', 'float', 'bool', 'null')]
    public string|float|bool|null $fallback;

    /**
     * @param array{
     *   key: string,
     *   type: value-of<CreateContactPropertyRequestType>,
     *   fallback?: (
     *    string
     *   |float
     *   |bool
     * )|null,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->key = $values['key'];
        $this->type = $values['type'];
        $this->fallback = $values['fallback'] ?? null;
    }
}
