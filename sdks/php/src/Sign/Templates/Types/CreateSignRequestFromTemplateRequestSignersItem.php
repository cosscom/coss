<?php

namespace Coss\Sign\Templates\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateSignRequestFromTemplateRequestSignersItem extends JsonSerializableType
{
    /**
     * @var string $role The role's key, e.g. `client`.
     */
    #[JsonProperty('role')]
    public string $role;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var string $email
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @var ?value-of<CreateSignRequestFromTemplateRequestSignersItemDelivery> $delivery
     */
    #[JsonProperty('delivery')]
    public ?string $delivery;

    /**
     * @var ?int $order
     */
    #[JsonProperty('order')]
    public ?int $order;

    /**
     * @var ?string $clientRef
     */
    #[JsonProperty('client_ref')]
    public ?string $clientRef;

    /**
     * @param array{
     *   role: string,
     *   name: string,
     *   email: string,
     *   delivery?: ?value-of<CreateSignRequestFromTemplateRequestSignersItemDelivery>,
     *   order?: ?int,
     *   clientRef?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->role = $values['role'];
        $this->name = $values['name'];
        $this->email = $values['email'];
        $this->delivery = $values['delivery'] ?? null;
        if (array_key_exists('delivery', $values)) {
            $this->_setField('delivery');
        }
        $this->order = $values['order'] ?? null;
        if (array_key_exists('order', $values)) {
            $this->_setField('order');
        }
        $this->clientRef = $values['clientRef'] ?? null;
        if (array_key_exists('clientRef', $values)) {
            $this->_setField('clientRef');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
