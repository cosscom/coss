<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;
use Coss\Core\Types\ArrayType;

class DomainDmarcReportSummary extends JsonSerializableType
{
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
     * @var int $reports
     */
    #[JsonProperty('reports')]
    public int $reports;

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
     * @var int $cossMessages
     */
    #[JsonProperty('coss_messages')]
    public int $cossMessages;

    /**
     * @var int $cossPassing
     */
    #[JsonProperty('coss_passing')]
    public int $cossPassing;

    /**
     * @var ?DateTime $firstReportAt
     */
    #[JsonProperty('first_report_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $firstReportAt;

    /**
     * @var ?DateTime $lastReportAt
     */
    #[JsonProperty('last_report_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $lastReportAt;

    /**
     * @var array<DmarcSource> $sources The 50 sources with the most messages in the period.
     */
    #[JsonProperty('sources'), ArrayType([DmarcSource::class])]
    public array $sources;

    /**
     * @param array{
     *   periodStart: DateTime,
     *   periodEnd: DateTime,
     *   reports: int,
     *   messages: int,
     *   passing: int,
     *   cossMessages: int,
     *   cossPassing: int,
     *   sources: array<DmarcSource>,
     *   firstReportAt?: ?DateTime,
     *   lastReportAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->periodStart = $values['periodStart'];
        $this->periodEnd = $values['periodEnd'];
        $this->reports = $values['reports'];
        $this->messages = $values['messages'];
        $this->passing = $values['passing'];
        $this->cossMessages = $values['cossMessages'];
        $this->cossPassing = $values['cossPassing'];
        $this->firstReportAt = $values['firstReportAt'] ?? null;
        $this->lastReportAt = $values['lastReportAt'] ?? null;
        $this->sources = $values['sources'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
