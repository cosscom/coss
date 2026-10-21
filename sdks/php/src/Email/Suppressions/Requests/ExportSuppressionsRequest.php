<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\ExportSuppressionsRequestScopeZero;
use Coss\Types\ExportSuppressionsRequestScopeOne;
use Coss\Email\Suppressions\Types\ExportSuppressionsRequestReason;

class ExportSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var (
     *    value-of<ExportSuppressionsRequestScopeZero>
     *   |value-of<ExportSuppressionsRequestScopeOne>
     *   |string
     * )|null $scope Only entries with this scope.
     */
    public string|null $scope;

    /**
     * @var ?value-of<ExportSuppressionsRequestReason> $reason Only entries with this reason.
     */
    public ?string $reason;

    /**
     * @param array{
     *   scope?: (
     *    value-of<ExportSuppressionsRequestScopeZero>
     *   |value-of<ExportSuppressionsRequestScopeOne>
     *   |string
     * )|null,
     *   reason?: ?value-of<ExportSuppressionsRequestReason>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->scope = $values['scope'] ?? null;
        $this->reason = $values['reason'] ?? null;
    }
}
