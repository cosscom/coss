<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class Suppression extends JsonSerializableType
{
    /**
     * @var value-of<SuppressionObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $address The bare, lower-cased address.
     */
    #[JsonProperty('address')]
    public string $address;

    /**
     * @var string $scope `*` (every email) or a category.
     */
    #[JsonProperty('scope')]
    public string $scope;

    /**
     * @var value-of<SuppressionReason> $reason `bounce`: added after a permanent bounce. `complaint`: added after a spam complaint. `manual`: added one by one through the API or dashboard. `import`: added by a bulk import. `unsubscribe`: added by the recipient's one-click unsubscribe, scoped to the email's category.
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var ?string $emailId The email whose bounce or complaint added this entry.
     */
    #[JsonProperty('email_id')]
    public ?string $emailId;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @param array{
     *   object: value-of<SuppressionObject>,
     *   id: string,
     *   address: string,
     *   scope: string,
     *   reason: value-of<SuppressionReason>,
     *   createdAt: DateTime,
     *   emailId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->address = $values['address'];
        $this->scope = $values['scope'];
        $this->reason = $values['reason'];
        $this->emailId = $values['emailId'] ?? null;
        $this->createdAt = $values['createdAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
