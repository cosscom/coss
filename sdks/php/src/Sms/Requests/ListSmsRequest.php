<?php

namespace Coss\Sms\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class ListSmsRequest extends JsonSerializableType
{
    /**
     * @var ?string $to Only messages to this number.
     */
    public ?string $to;

    /**
     * @var ?string $status Only messages in these statuses, comma-separated: `failed`.
     */
    public ?string $status;

    /**
     * @var ?DateTime $createdAfter Only messages created at or after this time.
     */
    public ?DateTime $createdAfter;

    /**
     * @var ?DateTime $createdBefore Only messages created before this time.
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
     *   to?: ?string,
     *   status?: ?string,
     *   createdAfter?: ?DateTime,
     *   createdBefore?: ?DateTime,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->to = $values['to'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->createdAfter = $values['createdAfter'] ?? null;
        $this->createdBefore = $values['createdBefore'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
