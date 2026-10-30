<?php

namespace Coss\Verify\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Verify\Types\StartVerificationRequestChannel;
use Coss\Verify\Types\StartVerificationRequestTagsItem;
use Coss\Core\Types\ArrayType;

class StartVerificationRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original verification instead of sending another code, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var string $to Where the code goes: a mobile number in E.164 form, or an email address. A pending verification to the same destination and channel is reused: its code is sent again.
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @var ?value-of<StartVerificationRequestChannel> $channel `sms` or `email`. Default: `sms` for a phone number, `email` for an address.
     */
    #[JsonProperty('channel')]
    public ?string $channel;

    /**
     * @var ?string $ip The end user's IP address. The fraud guard uses it (velocity, Tor); recommended.
     */
    #[JsonProperty('ip')]
    public ?string $ip;

    /**
     * @var ?string $userId Your id for the end user, for the fraud guard's velocity and your Risk lists.
     */
    #[JsonProperty('user_id')]
    public ?string $userId;

    /**
     * @var ?array<StartVerificationRequestTagsItem> $tags Up to 10 tags.
     */
    #[JsonProperty('tags'), ArrayType([StartVerificationRequestTagsItem::class])]
    public ?array $tags;

    /**
     * @param array{
     *   to: string,
     *   idempotencyKey?: ?string,
     *   channel?: ?value-of<StartVerificationRequestChannel>,
     *   ip?: ?string,
     *   userId?: ?string,
     *   tags?: ?array<StartVerificationRequestTagsItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        if (array_key_exists('idempotencyKey', $values)) {
            $this->_setField('idempotencyKey');
        }
        $this->to = $values['to'];
        $this->channel = $values['channel'] ?? null;
        if (array_key_exists('channel', $values)) {
            $this->_setField('channel');
        }
        $this->ip = $values['ip'] ?? null;
        if (array_key_exists('ip', $values)) {
            $this->_setField('ip');
        }
        $this->userId = $values['userId'] ?? null;
        if (array_key_exists('userId', $values)) {
            $this->_setField('userId');
        }
        $this->tags = $values['tags'] ?? null;
        if (array_key_exists('tags', $values)) {
            $this->_setField('tags');
        }
    }
}
