<?php

namespace Coss\Logs\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class ListLogsRequest extends JsonSerializableType
{
    /**
     * @var ?DateTime $from Start of the range (inclusive). Defaults to an hour before `to`.
     */
    public ?DateTime $from;

    /**
     * @var ?DateTime $to End of the range (exclusive). Defaults to now. At most 31 days.
     */
    public ?DateTime $to;

    /**
     * @var ?string $source Only these sources, comma-separated: `api,email,webhook`.
     */
    public ?string $source;

    /**
     * @var ?string $level Only these levels, comma-separated: `warning,error`.
     */
    public ?string $level;

    /**
     * @var ?string $type Only these types, e.g. `email.bounced,email.complained`.
     */
    public ?string $type;

    /**
     * @var ?string $status Only these status codes or classes, e.g. `4xx,503`.
     */
    public ?string $status;

    /**
     * @var ?string $method Only these HTTP methods, e.g. `POST`.
     */
    public ?string $method;

    /**
     * @var ?string $route Only these routes, e.g. `/v1/emails/:id`.
     */
    public ?string $route;

    /**
     * @var ?string $apiKeyId Only requests made with these API keys.
     */
    public ?string $apiKeyId;

    /**
     * @var ?string $requestId Only this request's lines.
     */
    public ?string $requestId;

    /**
     * @var ?string $resourceId Only lines about this resource, e.g. an `email_…` id.
     */
    public ?string $resourceId;

    /**
     * @var ?string $q Free text, matched against the message, path, ids and recipient.
     */
    public ?string $q;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last line of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   from?: ?DateTime,
     *   to?: ?DateTime,
     *   source?: ?string,
     *   level?: ?string,
     *   type?: ?string,
     *   status?: ?string,
     *   method?: ?string,
     *   route?: ?string,
     *   apiKeyId?: ?string,
     *   requestId?: ?string,
     *   resourceId?: ?string,
     *   q?: ?string,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->from = $values['from'] ?? null;
        if (array_key_exists('from', $values)) {
            $this->_setField('from');
        }
        $this->to = $values['to'] ?? null;
        if (array_key_exists('to', $values)) {
            $this->_setField('to');
        }
        $this->source = $values['source'] ?? null;
        if (array_key_exists('source', $values)) {
            $this->_setField('source');
        }
        $this->level = $values['level'] ?? null;
        if (array_key_exists('level', $values)) {
            $this->_setField('level');
        }
        $this->type = $values['type'] ?? null;
        if (array_key_exists('type', $values)) {
            $this->_setField('type');
        }
        $this->status = $values['status'] ?? null;
        if (array_key_exists('status', $values)) {
            $this->_setField('status');
        }
        $this->method = $values['method'] ?? null;
        if (array_key_exists('method', $values)) {
            $this->_setField('method');
        }
        $this->route = $values['route'] ?? null;
        if (array_key_exists('route', $values)) {
            $this->_setField('route');
        }
        $this->apiKeyId = $values['apiKeyId'] ?? null;
        if (array_key_exists('apiKeyId', $values)) {
            $this->_setField('apiKeyId');
        }
        $this->requestId = $values['requestId'] ?? null;
        if (array_key_exists('requestId', $values)) {
            $this->_setField('requestId');
        }
        $this->resourceId = $values['resourceId'] ?? null;
        if (array_key_exists('resourceId', $values)) {
            $this->_setField('resourceId');
        }
        $this->q = $values['q'] ?? null;
        if (array_key_exists('q', $values)) {
            $this->_setField('q');
        }
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
    }
}
