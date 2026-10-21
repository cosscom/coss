<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CheckRiskLimitRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated allowed check with the same key is answered again without taking more tokens, for an hour. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var string $bucket The bucket's name.
     */
    #[JsonProperty('bucket')]
    public string $bucket;

    /**
     * @var string $key Who or what is limited: a user id, an email address, an IP address… coss.com keeps only a keyed hash of it.
     */
    #[JsonProperty('key')]
    public string $key;

    /**
     * @var ?int $cost Tokens this request takes. Default 1.
     */
    #[JsonProperty('cost')]
    public ?int $cost;

    /**
     * @param array{
     *   bucket: string,
     *   key: string,
     *   idempotencyKey?: ?string,
     *   cost?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->bucket = $values['bucket'];
        $this->key = $values['key'];
        $this->cost = $values['cost'] ?? null;
    }
}
