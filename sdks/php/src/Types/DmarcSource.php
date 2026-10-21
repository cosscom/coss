<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class DmarcSource extends JsonSerializableType
{
    /**
     * @var string $sourceIp
     */
    #[JsonProperty('source_ip')]
    public string $sourceIp;

    /**
     * @var string $headerFrom The domain in the messages' From header.
     */
    #[JsonProperty('header_from')]
    public string $headerFrom;

    /**
     * @var int $messages
     */
    #[JsonProperty('messages')]
    public int $messages;

    /**
     * @var int $passing Messages that passed DMARC.
     */
    #[JsonProperty('passing')]
    public int $passing;

    /**
     * @var bool $viaCoss Signed with the domain's coss.com DKIM keys or sent from its coss.com MAIL FROM domain.
     */
    #[JsonProperty('via_coss')]
    public bool $viaCoss;

    /**
     * @param array{
     *   sourceIp: string,
     *   headerFrom: string,
     *   messages: int,
     *   passing: int,
     *   viaCoss: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->sourceIp = $values['sourceIp'];
        $this->headerFrom = $values['headerFrom'];
        $this->messages = $values['messages'];
        $this->passing = $values['passing'];
        $this->viaCoss = $values['viaCoss'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
