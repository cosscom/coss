<?php

namespace Coss\Email\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class ListEmailRequest extends JsonSerializableType
{
    /**
     * @var ?string $to Only emails with this recipient (in `to`, `cc` or `bcc`; the bare address, any case).
     */
    public ?string $to;

    /**
     * @var ?string $recipientStatus Only emails with a recipient in one of these statuses, comma-separated: `bounced,complained`. With `to`, that recipient's status.
     */
    public ?string $recipientStatus;

    /**
     * @var ?string $status Only emails in these statuses, comma-separated: `failed`.
     */
    public ?string $status;

    /**
     * @var ?string $q Free text, matched against the subject and the `to` addresses.
     */
    public ?string $q;

    /**
     * @var ?string $category Only emails of this category.
     */
    public ?string $category;

    /**
     * @var ?string $batchId Only the emails of this batch.
     */
    public ?string $batchId;

    /**
     * @var ?DateTime $createdAfter Only emails created at or after this time.
     */
    public ?DateTime $createdAfter;

    /**
     * @var ?DateTime $createdBefore Only emails created before this time.
     */
    public ?DateTime $createdBefore;

    /**
     * @var ?int $limit 1-100, default 20.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last email of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   to?: ?string,
     *   recipientStatus?: ?string,
     *   status?: ?string,
     *   q?: ?string,
     *   category?: ?string,
     *   batchId?: ?string,
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
        $this->recipientStatus = $values['recipientStatus'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->q = $values['q'] ?? null;
        $this->category = $values['category'] ?? null;
        $this->batchId = $values['batchId'] ?? null;
        $this->createdAfter = $values['createdAfter'] ?? null;
        $this->createdBefore = $values['createdBefore'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
