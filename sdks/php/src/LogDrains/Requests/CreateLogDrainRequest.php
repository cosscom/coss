<?php

namespace Coss\LogDrains\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Types\LogDrainSource;
use Coss\Core\Types\ArrayType;

class CreateLogDrainRequest extends JsonSerializableType
{
    /**
     * @var string $url An `https://` URL coss.com posts batches of log lines to.
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @var ?string $description A note for your own reference. `null` clears it.
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<value-of<LogDrainSource>> $sources What the drain forwards: `api` (requests made with the environment's API keys), `email` (email events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from the organization's audit log). An empty array means every source, including ones added later. Defaults to every source.
     */
    #[JsonProperty('sources'), ArrayType(['string'])]
    public ?array $sources;

    /**
     * @param array{
     *   url: string,
     *   description?: ?string,
     *   sources?: ?array<value-of<LogDrainSource>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->url = $values['url'];
        $this->description = $values['description'] ?? null;
        $this->sources = $values['sources'] ?? null;
    }
}
