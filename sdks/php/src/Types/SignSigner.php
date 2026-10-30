<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class SignSigner extends JsonSerializableType
{
    /**
     * @var value-of<SignSignerObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

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
     * @var int $order
     */
    #[JsonProperty('order')]
    public int $order;

    /**
     * @var value-of<SignSignerDelivery> $delivery
     */
    #[JsonProperty('delivery')]
    public string $delivery;

    /**
     * @var value-of<SignSignerAuthentication> $authentication How the signer is identified: `email_link` (they opened the link coss.com emailed) or `customer_asserted` (your app vouched for them).
     */
    #[JsonProperty('authentication')]
    public string $authentication;

    /**
     * @var value-of<SignSignerStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $clientRef
     */
    #[JsonProperty('client_ref')]
    public ?string $clientRef;

    /**
     * @var ?DateTime $viewedAt
     */
    #[JsonProperty('viewed_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $viewedAt;

    /**
     * @var ?DateTime $signedAt
     */
    #[JsonProperty('signed_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $signedAt;

    /**
     * @var ?DateTime $declinedAt
     */
    #[JsonProperty('declined_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $declinedAt;

    /**
     * @var ?string $declineReason
     */
    #[JsonProperty('decline_reason')]
    public ?string $declineReason;

    /**
     * @param array{
     *   object: value-of<SignSignerObject>,
     *   id: string,
     *   name: string,
     *   email: string,
     *   order: int,
     *   delivery: value-of<SignSignerDelivery>,
     *   authentication: value-of<SignSignerAuthentication>,
     *   status: value-of<SignSignerStatus>,
     *   clientRef?: ?string,
     *   viewedAt?: ?DateTime,
     *   signedAt?: ?DateTime,
     *   declinedAt?: ?DateTime,
     *   declineReason?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->email = $values['email'];
        $this->order = $values['order'];
        $this->delivery = $values['delivery'];
        $this->authentication = $values['authentication'];
        $this->status = $values['status'];
        $this->clientRef = $values['clientRef'] ?? null;
        if (array_key_exists('clientRef', $values)) {
            $this->_setField('clientRef');
        }
        $this->viewedAt = $values['viewedAt'] ?? null;
        if (array_key_exists('viewedAt', $values)) {
            $this->_setField('viewedAt');
        }
        $this->signedAt = $values['signedAt'] ?? null;
        if (array_key_exists('signedAt', $values)) {
            $this->_setField('signedAt');
        }
        $this->declinedAt = $values['declinedAt'] ?? null;
        if (array_key_exists('declinedAt', $values)) {
            $this->_setField('declinedAt');
        }
        $this->declineReason = $values['declineReason'] ?? null;
        if (array_key_exists('declineReason', $values)) {
            $this->_setField('declineReason');
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
