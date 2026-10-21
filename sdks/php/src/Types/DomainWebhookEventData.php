<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class DomainWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $organizationId
     */
    #[JsonProperty('organization_id')]
    public string $organizationId;

    /**
     * @var string $domainId
     */
    #[JsonProperty('domain_id')]
    public string $domainId;

    /**
     * @var string $domain
     */
    #[JsonProperty('domain')]
    public string $domain;

    /**
     * @var string $dmarcReportId
     */
    #[JsonProperty('dmarc_report_id')]
    public string $dmarcReportId;

    /**
     * @var string $reporter The reporting organization (`org_name`).
     */
    #[JsonProperty('reporter')]
    public string $reporter;

    /**
     * @var DateTime $periodStart
     */
    #[JsonProperty('period_start'), Date(Date::TYPE_DATETIME)]
    public DateTime $periodStart;

    /**
     * @var DateTime $periodEnd
     */
    #[JsonProperty('period_end'), Date(Date::TYPE_DATETIME)]
    public DateTime $periodEnd;

    /**
     * @var int $messages
     */
    #[JsonProperty('messages')]
    public int $messages;

    /**
     * @var int $passing
     */
    #[JsonProperty('passing')]
    public int $passing;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @param array{
     *   organizationId: string,
     *   domainId: string,
     *   domain: string,
     *   dmarcReportId: string,
     *   reporter: string,
     *   periodStart: DateTime,
     *   periodEnd: DateTime,
     *   messages: int,
     *   passing: int,
     *   occurredAt: DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->organizationId = $values['organizationId'];
        $this->domainId = $values['domainId'];
        $this->domain = $values['domain'];
        $this->dmarcReportId = $values['dmarcReportId'];
        $this->reporter = $values['reporter'];
        $this->periodStart = $values['periodStart'];
        $this->periodEnd = $values['periodEnd'];
        $this->messages = $values['messages'];
        $this->passing = $values['passing'];
        $this->occurredAt = $values['occurredAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
