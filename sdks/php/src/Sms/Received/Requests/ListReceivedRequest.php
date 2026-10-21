<?php

namespace Coss\Sms\Received\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class ListReceivedRequest extends JsonSerializableType
{
    /**
     * @var ?string $from Only messages from this number.
     */
    public ?string $from;

    /**
     * @var ?string $to Only messages to this number of yours.
     */
    public ?string $to;

    /**
     * @var ?DateTime $createdAfter
     */
    public ?DateTime $createdAfter;

    /**
     * @var ?DateTime $createdBefore
     */
    public ?DateTime $createdBefore;

    /**
     * @var ?int $limit 1-100, default 20.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last item of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   from?: ?string,
     *   to?: ?string,
     *   createdAfter?: ?DateTime,
     *   createdBefore?: ?DateTime,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->from = $values['from'] ?? null;
        $this->to = $values['to'] ?? null;
        $this->createdAfter = $values['createdAfter'] ?? null;
        $this->createdBefore = $values['createdBefore'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
