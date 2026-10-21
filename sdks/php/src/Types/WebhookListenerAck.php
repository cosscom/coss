<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class WebhookListenerAck extends JsonSerializableType
{
    /**
     * @var string $deliveryId
     */
    #[JsonProperty('delivery_id')]
    public string $deliveryId;

    /**
     * @var string $ackToken The delivery's `ack_token`.
     */
    #[JsonProperty('ack_token')]
    public string $ackToken;

    /**
     * @var ?int $statusCode What the local URL answered; `null` when nothing answered, or when the event was only printed.
     */
    #[JsonProperty('status_code')]
    public ?int $statusCode;

    /**
     * @var int $durationMs
     */
    #[JsonProperty('duration_ms')]
    public int $durationMs;

    /**
     * @var ?string $error Why forwarding failed (e.g. `connection refused`); `null` if it didn't.
     */
    #[JsonProperty('error')]
    public ?string $error;

    /**
     * @param array{
     *   deliveryId: string,
     *   ackToken: string,
     *   durationMs: int,
     *   statusCode?: ?int,
     *   error?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->deliveryId = $values['deliveryId'];
        $this->ackToken = $values['ackToken'];
        $this->statusCode = $values['statusCode'] ?? null;
        if (array_key_exists('statusCode', $values)) {
            $this->_setField('statusCode');
        }
        $this->durationMs = $values['durationMs'];
        $this->error = $values['error'] ?? null;
        if (array_key_exists('error', $values)) {
            $this->_setField('error');
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
