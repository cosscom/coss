<?php

namespace Coss\Email\Contacts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Contacts\Types\ListContactsRequestStatus;

class ListContactsRequest extends JsonSerializableType
{
    /**
     * @var ?string $email Only the contact with this address.
     */
    public ?string $email;

    /**
     * @var ?value-of<ListContactsRequestStatus> $status
     */
    public ?string $status;

    /**
     * @var ?string $audienceId Only members of this audience.
     */
    public ?string $audienceId;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last contact of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   email?: ?string,
     *   status?: ?value-of<ListContactsRequestStatus>,
     *   audienceId?: ?string,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->email = $values['email'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->audienceId = $values['audienceId'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
