<?php

namespace Coss\Laravel;

/**
 * Helpers that turn a message's parts into what the API takes. They mirror the coss SDK's
 * `packages/sdk/src/core/mime.ts`; integrations/README.md has the rules.
 *
 * @internal
 */
final class Mime
{
    /**
     * Headers the API refuses because coss.com or the provider sets them (`RESERVED_HEADERS` in
     * `packages/email/src/schemas.ts`). Mailers set several on every message, so they are dropped.
     */
    public const RESERVED_HEADERS = [
        'from',
        'to',
        'cc',
        'bcc',
        'reply-to',
        'subject',
        'sender',
        'return-path',
        'date',
        'message-id',
        'mime-version',
        'content-type',
        'content-transfer-encoding',
        'content-disposition',
        'dkim-signature',
        'received',
    ];

    /** One encoded-word holds at most 75 characters, which leaves 45 bytes of UTF-8. */
    private const ENCODED_WORD_BYTES = 45;

    public static function isReservedHeader(string $name): bool
    {
        $lower = strtolower(trim($name));

        return in_array($lower, self::RESERVED_HEADERS, true) || str_starts_with($lower, 'x-ses-');
    }

    /** `addr`, or `Name <addr>` with the name quoted when it contains RFC 5322 specials. */
    public static function formatAddress(string $address, ?string $name = null): string
    {
        $name = self::trim($name ?? '');
        if ($name === '') {
            return $address;
        }
        if (preg_match('/["<>,;:@()\[\]\\\\]/', $name)) {
            $name = '"'.addcslashes($name, '"\\').'"';
        }

        return "{$name} <{$address}>";
    }

    /**
     * A header value as the API takes it: one line of printable ASCII. Folded lines are unfolded,
     * other control characters become spaces, and anything non-ASCII becomes RFC 2047
     * encoded-words (`=?UTF-8?B?…?=`). An empty string means the header is left out.
     */
    public static function encodeHeaderValue(string $value): string
    {
        $unfolded = preg_replace('/\r?\n[ \t]*/', ' ', $value);
        $unfolded = self::trim(preg_replace('/[\x00-\x1F\x7F]|\xC2[\x80-\x9F]/', ' ', $unfolded));
        if (preg_match('/^[\x20-\x7E]*$/', $unfolded)) {
            return $unfolded;
        }

        $words = [];
        $chunk = '';
        foreach (mb_str_split($unfolded, 1, 'UTF-8') as $character) {
            if (strlen($chunk) + strlen($character) > self::ENCODED_WORD_BYTES) {
                $words[] = '=?UTF-8?B?'.base64_encode($chunk).'?=';
                $chunk = '';
            }
            $chunk .= $character;
        }
        if ($chunk !== '') {
            $words[] = '=?UTF-8?B?'.base64_encode($chunk).'?=';
        }

        return implode(' ', $words);
    }

    /** Trims Unicode whitespace, like JavaScript's `String.prototype.trim`. */
    public static function trim(string $value): string
    {
        return preg_replace('/^[\s\x{FEFF}]+|[\s\x{FEFF}]+$/u', '', $value) ?? trim($value);
    }

    /** `type/subtype` without parameters, lowercase (`text/plain; charset=utf-8` → `text/plain`). */
    public static function mediaType(?string $contentType): ?string
    {
        $type = strtolower(trim(explode(';', $contentType ?? '', 2)[0]));

        return $type === '' ? null : $type;
    }

    /** A Content-ID without its angle brackets (`<logo@acme>` → `logo@acme`). */
    public static function bareContentId(?string $cid): ?string
    {
        $id = preg_replace('/^<|>$/', '', trim($cid ?? ''));

        return $id === '' ? null : $id;
    }
}
