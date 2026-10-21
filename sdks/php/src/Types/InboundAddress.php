<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class InboundAddress extends JsonSerializableType
{
    /**
     * @var value-of<InboundAddressObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $environmentId
     */
    #[JsonProperty('environment_id')]
    public string $environmentId;

    /**
     * @var string $domain Email sent to any address at this domain is received by the environment, with no DNS setup. It never changes.
     */
    #[JsonProperty('domain')]
    public string $domain;

    /**
     * @param array{
     *   object: value-of<InboundAddressObject>,
     *   environmentId: string,
     *   domain: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->environmentId = $values['environmentId'];
        $this->domain = $values['domain'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
