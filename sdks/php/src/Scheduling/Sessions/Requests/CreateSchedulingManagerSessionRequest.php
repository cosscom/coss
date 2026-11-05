<?php

namespace Coss\Scheduling\Sessions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Core\Types\Union;

class CreateSchedulingManagerSessionRequest extends JsonSerializableType
{
    /**
     * @var ?array<string> $hosts The hosts this page can reach, by id or uid.
     */
    #[JsonProperty('hosts'), ArrayType(['string'])]
    public ?array $hosts;

    /**
     * @var ?array<string, (
     *    string
     *   |array<string>
     * )> $hostFilter Everyone matching these attributes, asked again on every request.
     */
    #[JsonProperty('host_filter'), ArrayType(['string' => new Union('string', ['string'])])]
    public ?array $hostFilter;

    /**
     * @var ?int $expiresIn Seconds until it stops working. At most a day.
     */
    #[JsonProperty('expires_in')]
    public ?int $expiresIn;

    /**
     * @var ?bool $readOnly
     */
    #[JsonProperty('read_only')]
    public ?bool $readOnly;

    /**
     * @param array{
     *   hosts?: ?array<string>,
     *   hostFilter?: ?array<string, (
     *    string
     *   |array<string>
     * )>,
     *   expiresIn?: ?int,
     *   readOnly?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->hosts = $values['hosts'] ?? null;
        if (array_key_exists('hosts', $values)) {
            $this->_setField('hosts');
        }
        $this->hostFilter = $values['hostFilter'] ?? null;
        if (array_key_exists('hostFilter', $values)) {
            $this->_setField('hostFilter');
        }
        $this->expiresIn = $values['expiresIn'] ?? null;
        if (array_key_exists('expiresIn', $values)) {
            $this->_setField('expiresIn');
        }
        $this->readOnly = $values['readOnly'] ?? null;
        if (array_key_exists('readOnly', $values)) {
            $this->_setField('readOnly');
        }
    }
}
