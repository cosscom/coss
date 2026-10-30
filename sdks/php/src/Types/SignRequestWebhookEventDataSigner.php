<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * The signer who viewed, signed or declined; `null` otherwise.
 */
class SignRequestWebhookEventDataSigner extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

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
     * @var ?string $clientRef
     */
    #[JsonProperty('client_ref')]
    public ?string $clientRef;

    /**
     * @var value-of<SignRequestWebhookEventDataSignerStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   id: string,
     *   name: string,
     *   email: string,
     *   status: value-of<SignRequestWebhookEventDataSignerStatus>,
     *   clientRef?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->email = $values['email'];
        $this->clientRef = $values['clientRef'] ?? null;
        if (array_key_exists('clientRef', $values)) {
            $this->_setField('clientRef');
        }
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
