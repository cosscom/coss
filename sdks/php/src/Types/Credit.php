<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class Credit extends JsonSerializableType
{
    /**
     * @var value-of<CreditObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<CreditKind> $kind `amount`: dollars (`amount` and `remaining` in cents); `units`: free units of `meter`.
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var int $amount
     */
    #[JsonProperty('amount')]
    public int $amount;

    /**
     * @var int $remaining
     */
    #[JsonProperty('remaining')]
    public int $remaining;

    /**
     * @var ?value-of<CreditMeter> $meter What a `units` credit covers.
     */
    #[JsonProperty('meter')]
    public ?string $meter;

    /**
     * @var ?array<value-of<CreditMetersItem>> $meters What an `amount` credit pays for (`null`: any usage).
     */
    #[JsonProperty('meters'), ArrayType(['string'])]
    public ?array $meters;

    /**
     * @var value-of<CreditAppliesTo> $appliesTo `any`: also fees and other charges.
     */
    #[JsonProperty('applies_to')]
    public string $appliesTo;

    /**
     * @var value-of<CreditSource> $source
     */
    #[JsonProperty('source')]
    public string $source;

    /**
     * @var string $description
     */
    #[JsonProperty('description')]
    public string $description;

    /**
     * @var DateTime $effectiveAt
     */
    #[JsonProperty('effective_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $effectiveAt;

    /**
     * @var ?DateTime $expiresAt
     */
    #[JsonProperty('expires_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $expiresAt;

    /**
     * @var ?DateTime $voidedAt
     */
    #[JsonProperty('voided_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $voidedAt;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @param array{
     *   object: value-of<CreditObject>,
     *   id: string,
     *   kind: value-of<CreditKind>,
     *   amount: int,
     *   remaining: int,
     *   appliesTo: value-of<CreditAppliesTo>,
     *   source: value-of<CreditSource>,
     *   description: string,
     *   effectiveAt: DateTime,
     *   createdAt: DateTime,
     *   meter?: ?value-of<CreditMeter>,
     *   meters?: ?array<value-of<CreditMetersItem>>,
     *   expiresAt?: ?DateTime,
     *   voidedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->amount = $values['amount'];
        $this->remaining = $values['remaining'];
        $this->meter = $values['meter'] ?? null;
        $this->meters = $values['meters'] ?? null;
        $this->appliesTo = $values['appliesTo'];
        $this->source = $values['source'];
        $this->description = $values['description'];
        $this->effectiveAt = $values['effectiveAt'];
        $this->expiresAt = $values['expiresAt'] ?? null;
        $this->voidedAt = $values['voidedAt'] ?? null;
        $this->createdAt = $values['createdAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
