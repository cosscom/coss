<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class InvoiceLine extends JsonSerializableType
{
    /**
     * @var value-of<InvoiceLineObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<InvoiceLineKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var string $description
     */
    #[JsonProperty('description')]
    public string $description;

    /**
     * @var ?value-of<InvoiceLineMeter> $meter What is counted, e.g. `email.recipients`.
     */
    #[JsonProperty('meter')]
    public ?string $meter;

    /**
     * @var ?string $dimension
     */
    #[JsonProperty('dimension')]
    public ?string $dimension;

    /**
     * @var ?int $quantity
     */
    #[JsonProperty('quantity')]
    public ?int $quantity;

    /**
     * @var ?int $includedQuantity Units covered by an allowance or committed volume (not charged).
     */
    #[JsonProperty('included_quantity')]
    public ?int $includedQuantity;

    /**
     * @var ?string $unitPrice Dollars per unit, e.g. `0.0004`; `null` when the price varies by volume.
     */
    #[JsonProperty('unit_price')]
    public ?string $unitPrice;

    /**
     * @var int $amount An amount in cents (USD).
     */
    #[JsonProperty('amount')]
    public int $amount;

    /**
     * @var InvoiceLinePeriod $period
     */
    #[JsonProperty('period')]
    public InvoiceLinePeriod $period;

    /**
     * @param array{
     *   object: value-of<InvoiceLineObject>,
     *   id: string,
     *   kind: value-of<InvoiceLineKind>,
     *   description: string,
     *   amount: int,
     *   period: InvoiceLinePeriod,
     *   meter?: ?value-of<InvoiceLineMeter>,
     *   dimension?: ?string,
     *   quantity?: ?int,
     *   includedQuantity?: ?int,
     *   unitPrice?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->description = $values['description'];
        $this->meter = $values['meter'] ?? null;
        $this->dimension = $values['dimension'] ?? null;
        $this->quantity = $values['quantity'] ?? null;
        $this->includedQuantity = $values['includedQuantity'] ?? null;
        $this->unitPrice = $values['unitPrice'] ?? null;
        $this->amount = $values['amount'];
        $this->period = $values['period'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
