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
        $this->to = $values['to'] ?? null;
        $this->source = $values['source'] ?? null;
        $this->level = $values['level'] ?? null;
        $this->type = $values['type'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->method = $values['method'] ?? null;
        $this->route = $values['route'] ?? null;
        $this->apiKeyId = $values['apiKeyId'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->resourceId = $values['resourceId'] ?? null;
        $this->q = $values['q'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
