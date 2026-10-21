<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class BillingFeatures extends JsonSerializableType
{
    /**
     * @var bool $trackingDomains
     */
    #[JsonProperty('tracking_domains')]
    public bool $trackingDomains;

    /**
     * @var bool $auditLog
     */
    #[JsonProperty('audit_log')]
    public bool $auditLog;

    /**
     * @var bool $logDrains
     */
    #[JsonProperty('log_drains')]
    public bool $logDrains;

    /**
     * @var bool $sso
     */
    #[JsonProperty('sso')]
    public bool $sso;

    /**
     * @var bool $scim
     */
    #[JsonProperty('scim')]
    public bool $scim;

    /**
     * @var bool $dedicatedIps
     */
    #[JsonProperty('dedicated_ips')]
    public bool $dedicatedIps;

    /**
     * @param array{
     *   trackingDomains: bool,
     *   auditLog: bool,
     *   logDrains: bool,
     *   sso: bool,
     *   scim: bool,
     *   dedicatedIps: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->trackingDomains = $values['trackingDomains'];
        $this->auditLog = $values['auditLog'];
        $this->logDrains = $values['logDrains'];
        $this->sso = $values['sso'];
        $this->scim = $values['scim'];
        $this->dedicatedIps = $values['dedicatedIps'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
