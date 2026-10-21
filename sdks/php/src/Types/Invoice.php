<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;
use Coss\Core\Types\ArrayType;

class Invoice extends JsonSerializableType
{
    /**
     * @var value-of<InvoiceObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $number
     */
    #[JsonProperty('number')]
    public ?string $number;

    /**
     * @var value-of<InvoiceKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var value-of<InvoiceStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var value-of<InvoiceCurrency> $currency
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @var InvoicePeriod $period
     */
    #[JsonProperty('period')]
    public InvoicePeriod $period;

    /**
     * @var int $subtotal An amount in cents (USD).
     */
    #[JsonProperty('subtotal')]
    public int $subtotal;

    /**
     * @var int $discount An amount in cents (USD).
     */
    #[JsonProperty('discount')]
    public int $discount;

    /**
     * @var int $credit An amount in cents (USD).
     */
    #[JsonProperty('credit')]
    public int $credit;

    /**
     * @var int $tax An amount in cents (USD).
     */
    #[JsonProperty('tax')]
    public int $tax;

    /**
     * @var int $total An amount in cents (USD).
     */
    #[JsonProperty('total')]
    public int $total;

    /**
     * @var int $amountPaid An amount in cents (USD).
     */
    #[JsonProperty('amount_paid')]
    public int $amountPaid;

    /**
     * @var int $amountDue An amount in cents (USD).
     */
    #[JsonProperty('amount_due')]
    public int $amountDue;

    /**
     * @var value-of<InvoiceCollectionMethod> $collectionMethod
     */
    #[JsonProperty('collection_method')]
    public string $collectionMethod;

    /**
     * @var ?DateTime $dueAt
     */
    #[JsonProperty('due_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $dueAt;

    /**
     * @var ?DateTime $finalizedAt
     */
    #[JsonProperty('finalized_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $finalizedAt;

    /**
     * @var ?DateTime $paidAt
     */
    #[JsonProperty('paid_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $paidAt;

    /**
     * @var ?DateTime $voidedAt
     */
    #[JsonProperty('voided_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $voidedAt;

    /**
     * @var ?string $hostedUrl A page to view (and pay) the invoice.
     */
    #[JsonProperty('hosted_url')]
    public ?string $hostedUrl;

    /**
     * @var ?string $pdfUrl
     */
    #[JsonProperty('pdf_url')]
    public ?string $pdfUrl;

    /**
     * @var array<InvoiceLine> $lines
     */
    #[JsonProperty('lines'), ArrayType([InvoiceLine::class])]
    public array $lines;

    /**
     * @param array{
     *   object: value-of<InvoiceObject>,
     *   id: string,
     *   kind: value-of<InvoiceKind>,
     *   status: value-of<InvoiceStatus>,
     *   currency: value-of<InvoiceCurrency>,
     *   period: InvoicePeriod,
     *   subtotal: int,
     *   discount: int,
     *   credit: int,
     *   tax: int,
     *   total: int,
     *   amountPaid: int,
     *   amountDue: int,
     *   collectionMethod: value-of<InvoiceCollectionMethod>,
     *   lines: array<InvoiceLine>,
     *   number?: ?string,
     *   dueAt?: ?DateTime,
     *   finalizedAt?: ?DateTime,
     *   paidAt?: ?DateTime,
     *   voidedAt?: ?DateTime,
     *   hostedUrl?: ?string,
     *   pdfUrl?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->number = $values['number'] ?? null;
        if (array_key_exists('number', $values)) {
            $this->_setField('number');
        }
        $this->kind = $values['kind'];
        $this->status = $values['status'];
        $this->currency = $values['currency'];
        $this->period = $values['period'];
        $this->subtotal = $values['subtotal'];
        $this->discount = $values['discount'];
        $this->credit = $values['credit'];
        $this->tax = $values['tax'];
        $this->total = $values['total'];
        $this->amountPaid = $values['amountPaid'];
        $this->amountDue = $values['amountDue'];
        $this->collectionMethod = $values['collectionMethod'];
        $this->dueAt = $values['dueAt'] ?? null;
        if (array_key_exists('dueAt', $values)) {
            $this->_setField('dueAt');
        }
        $this->finalizedAt = $values['finalizedAt'] ?? null;
        if (array_key_exists('finalizedAt', $values)) {
            $this->_setField('finalizedAt');
        }
        $this->paidAt = $values['paidAt'] ?? null;
        if (array_key_exists('paidAt', $values)) {
            $this->_setField('paidAt');
        }
        $this->voidedAt = $values['voidedAt'] ?? null;
        if (array_key_exists('voidedAt', $values)) {
            $this->_setField('voidedAt');
        }
        $this->hostedUrl = $values['hostedUrl'] ?? null;
        if (array_key_exists('hostedUrl', $values)) {
            $this->_setField('hostedUrl');
        }
        $this->pdfUrl = $values['pdfUrl'] ?? null;
        if (array_key_exists('pdfUrl', $values)) {
            $this->_setField('pdfUrl');
        }
        $this->lines = $values['lines'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
