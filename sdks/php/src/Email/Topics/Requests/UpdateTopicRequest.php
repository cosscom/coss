<?php

namespace Coss\Email\Topics\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Email\Topics\Types\UpdateTopicRequestDefaultSubscription;
use Coss\Email\Topics\Types\UpdateTopicRequestVisibility;

class UpdateTopicRequest extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?value-of<UpdateTopicRequestDefaultSubscription> $defaultSubscription `opt_in`: every subscribed contact gets the topic's emails unless they opt out. `opt_out`: only contacts who opted in do.
     */
    #[JsonProperty('default_subscription')]
    public ?string $defaultSubscription;

    /**
     * @var ?value-of<UpdateTopicRequestVisibility> $visibility `private` topics never show in the preference center (default `public`).
     */
    #[JsonProperty('visibility')]
    public ?string $visibility;

    /**
     * @var ?int $position Order in the preference center (ascending).
     */
    #[JsonProperty('position')]
    public ?int $position;

    /**
     * @param array{
     *   name?: ?string,
     *   description?: ?string,
     *   defaultSubscription?: ?value-of<UpdateTopicRequestDefaultSubscription>,
     *   visibility?: ?value-of<UpdateTopicRequestVisibility>,
     *   position?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        $this->description = $values['description'] ?? null;
        $this->defaultSubscription = $values['defaultSubscription'] ?? null;
        $this->visibility = $values['visibility'] ?? null;
        $this->position = $values['position'] ?? null;
    }
}
