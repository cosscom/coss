<?php

namespace Coss\Hooks\Messages\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SendHookMessageRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original message instead of sending again, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var string $eventType What happened, e.g. `invoice.paid`. Endpoints that filter by type only get the types they chose. The type doesn't have to be registered.
     */
    #[JsonProperty('event_type')]
    public string $eventType;

    /**
     * @var array<string, mixed> $payload The JSON object delivered as the request body (at most 256 KB serialized). It is parsed and serialized again: send integers beyond 2^53 as strings.
     */
    #[JsonProperty('payload'), ArrayType(['string' => 'mixed'])]
    public array $payload;

    /**
     * @param array{
     *   eventType: string,
     *   payload: array<string, mixed>,
     *   idempotencyKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->eventType = $values['eventType'];
        $this->payload = $values['payload'];
    }
}
