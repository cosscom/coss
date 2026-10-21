<?php

namespace Coss\Email\Contacts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Contacts\Types\ExportContactsRequestStatus;

class ExportContactsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ExportContactsRequestStatus> $status
     */
    public ?string $status;

    /**
     * @var ?string $audienceId Only members of this audience.
     */
    public ?string $audienceId;

    /**
     * @param array{
     *   status?: ?value-of<ExportContactsRequestStatus>,
     *   audienceId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->status = $values['status'] ?? null;
        $this->audienceId = $values['audienceId'] ?? null;
    }
}
