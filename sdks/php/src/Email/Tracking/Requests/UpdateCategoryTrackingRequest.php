<?php

namespace Coss\Email\Tracking\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\UpdateTrackingRuleRequest;

class UpdateCategoryTrackingRequest extends JsonSerializableType
{
    /**
     * @var UpdateTrackingRuleRequest $body
     */
    public UpdateTrackingRuleRequest $body;

    /**
     * @param array{
     *   body: UpdateTrackingRuleRequest,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
