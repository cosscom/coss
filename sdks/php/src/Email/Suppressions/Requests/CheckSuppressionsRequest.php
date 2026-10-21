<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Suppressions\Types\CheckSuppressionsRequestStream;

class CheckSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var string $address The address to check.
     */
    public string $address;

    /**
     * @var ?string $category The category of the email you plan to send. Without it, only `*` entries count.
     */
    public ?string $category;

    /**
     * @var ?value-of<CheckSuppressionsRequestStream> $stream The stream of the email you plan to send (default `transactional`). `marketing` also counts `stream:marketing` entries.
     */
    public ?string $stream;

    /**
     * @param array{
     *   address: string,
     *   category?: ?string,
     *   stream?: ?value-of<CheckSuppressionsRequestStream>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->address = $values['address'];
        $this->category = $values['category'] ?? null;
        $this->stream = $values['stream'] ?? null;
    }
}
