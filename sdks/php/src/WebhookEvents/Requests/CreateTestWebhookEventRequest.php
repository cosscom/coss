<?php

namespace Coss\WebhookEvents\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\WebhookEvents\Types\CreateTestWebhookEventRequestType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class CreateTestWebhookEventRequest extends JsonSerializableType
{
    /**
     * @var value-of<CreateTestWebhookEventRequestType> $type The event type. `domain.*`, `account.*`, `subaccount.*` and `billing.*` events only reach live environments, so they can't be tested in a sandbox one.
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?array<string, mixed> $data Fields merged over the sample's `data` (objects field by field, anything else replaced), in the latest API version's shape: e.g. a real `email_id`, or the `recipient` your handler looks for. Unknown fields are refused.
     */
    #[JsonProperty('data'), ArrayType(['string' => 'mixed'])]
    public ?array $data;

    /**
     * @param array{
     *   type: value-of<CreateTestWebhookEventRequestType>,
     *   data?: ?array<string, mixed>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->data = $values['data'] ?? null;
        if (array_key_exists('data', $values)) {
            $this->_setField('data');
        }
    }
}
