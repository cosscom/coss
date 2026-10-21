<?php

namespace Coss\Hooks\Endpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class UpdateHookEndpointRequest extends JsonSerializableType
{
    /**
     * @var ?string $url
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<string> $filterTypes Event types delivered to this endpoint (existing, unarchived ones). An empty array means every type, including ones added later.
     */
    #[JsonProperty('filter_types'), ArrayType(['string'])]
    public ?array $filterTypes;

    /**
     * @var ?int $rateLimitPerSecond At most this many requests per second to this endpoint.
     */
    #[JsonProperty('rate_limit_per_second')]
    public ?int $rateLimitPerSecond;

    /**
     * @var ?array<string, string> $metadata Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'string'])]
    public ?array $metadata;

    /**
     * @var ?bool $enabled
     */
    #[JsonProperty('enabled')]
    public ?bool $enabled;

    /**
     * @param array{
     *   url?: ?string,
     *   description?: ?string,
     *   filterTypes?: ?array<string>,
     *   rateLimitPerSecond?: ?int,
     *   metadata?: ?array<string, string>,
     *   enabled?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->url = $values['url'] ?? null;
        $this->description = $values['description'] ?? null;
        $this->filterTypes = $values['filterTypes'] ?? null;
        $this->rateLimitPerSecond = $values['rateLimitPerSecond'] ?? null;
        $this->metadata = $values['metadata'] ?? null;
        $this->enabled = $values['enabled'] ?? null;
    }
}
