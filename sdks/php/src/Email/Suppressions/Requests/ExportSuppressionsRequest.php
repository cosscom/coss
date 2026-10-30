<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\ExportSuppressionsRequestScopeZero;
use Coss\Types\ExportSuppressionsRequestScopeOne;
use Coss\Email\Suppressions\Types\ExportSuppressionsRequestReason;

class ExportSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var ?string $subaccount Export a sub-account's own list (its id or your uid) instead of the environment's.
     */
    public ?string $subaccount;

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
     *   subaccount?: ?string,
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
        $this->subaccount = $values['subaccount'] ?? null;
        if (array_key_exists('subaccount', $values)) {
            $this->_setField('subaccount');
        }
        $this->scope = $values['scope'] ?? null;
        if (array_key_exists('scope', $values)) {
            $this->_setField('scope');
        }
        $this->reason = $values['reason'] ?? null;
        if (array_key_exists('reason', $values)) {
            $this->_setField('reason');
        }
    }
}
