<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Core\Types\Union;
use DateTime;
use Coss\Core\Types\Date;

class Contact extends JsonSerializableType
{
    /**
     * @var value-of<ContactObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $email
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @var ?string $firstName
     */
    #[JsonProperty('first_name')]
    public ?string $firstName;

    /**
     * @var ?string $lastName
     */
    #[JsonProperty('last_name')]
    public ?string $lastName;

    /**
     * @var value-of<ContactStatus> $status Consent to marketing email: `subscribed`, `unsubscribed` (never receives marketing email; transactional email is unaffected) or `pending` (waiting for a double opt-in confirmation).
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var array<string, (
     *    string
     *   |float
     *   |bool
     * )> $properties
     */
    #[JsonProperty('properties'), ArrayType(['string' => new Union('string', 'float', 'bool')])]
    public array $properties;

    /**
     * @var value-of<ContactSource> $source How the contact was created.
     */
    #[JsonProperty('source')]
    public string $source;

    /**
     * @var ?DateTime $subscribedAt
     */
    #[JsonProperty('subscribed_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $subscribedAt;

    /**
     * @var ?DateTime $unsubscribedAt
     */
    #[JsonProperty('unsubscribed_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $unsubscribedAt;

    /**
     * @var ?DateTime $confirmedAt When the contact confirmed a double opt-in.
     */
    #[JsonProperty('confirmed_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $confirmedAt;

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
     *   object: value-of<ContactObject>,
     *   id: string,
     *   email: string,
     *   status: value-of<ContactStatus>,
     *   properties: array<string, (
     *    string
     *   |float
     *   |bool
     * )>,
     *   source: value-of<ContactSource>,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   firstName?: ?string,
     *   lastName?: ?string,
     *   subscribedAt?: ?DateTime,
     *   unsubscribedAt?: ?DateTime,
     *   confirmedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->email = $values['email'];
        $this->firstName = $values['firstName'] ?? null;
        $this->lastName = $values['lastName'] ?? null;
        $this->status = $values['status'];
        $this->properties = $values['properties'];
        $this->source = $values['source'];
        $this->subscribedAt = $values['subscribedAt'] ?? null;
        $this->unsubscribedAt = $values['unsubscribedAt'] ?? null;
        $this->confirmedAt = $values['confirmedAt'] ?? null;
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
