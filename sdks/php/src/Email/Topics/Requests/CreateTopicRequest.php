<?php

namespace Coss\Email\Topics\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Email\Topics\Types\CreateTopicRequestDefaultSubscription;
use Coss\Email\Topics\Types\CreateTopicRequestVisibility;

class CreateTopicRequest extends JsonSerializableType
{
    /**
     * @var string $key
     */
    #[JsonProperty('key')]
    public string $key;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var value-of<CreateTopicRequestDefaultSubscription> $defaultSubscription `opt_in`: every subscribed contact gets the topic's emails unless they opt out. `opt_out`: only contacts who opted in do.
     */
    #[JsonProperty('default_subscription')]
    public string $defaultSubscription;

    /**
     * @var ?value-of<CreateTopicRequestVisibility> $visibility `private` topics never show in the preference center (default `public`).
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
     *   key: string,
     *   name: string,
     *   defaultSubscription: value-of<CreateTopicRequestDefaultSubscription>,
     *   description?: ?string,
     *   visibility?: ?value-of<CreateTopicRequestVisibility>,
     *   position?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->key = $values['key'];
        $this->name = $values['name'];
        $this->description = $values['description'] ?? null;
        if (array_key_exists('description', $values)) {
            $this->_setField('description');
        }
        $this->defaultSubscription = $values['defaultSubscription'];
        $this->visibility = $values['visibility'] ?? null;
        if (array_key_exists('visibility', $values)) {
            $this->_setField('visibility');
        }
        $this->position = $values['position'] ?? null;
        if (array_key_exists('position', $values)) {
            $this->_setField('position');
        }
    }
}
