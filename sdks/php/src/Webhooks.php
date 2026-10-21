<?php

// Hand-written (listed in .fernignore): verifies coss.com webhook and log drain requests (Standard
// Webhooks signatures), like the TypeScript SDK's verifyWebhook and verifyLogDrainBatch.

namespace Coss;

use JsonException;

final class Webhooks
{
    private const SECRET_PREFIX = 'whsec_';
    public const DEFAULT_TOLERANCE_SECONDS = 300;

    /**
     * Checks the request's signature and age, then returns the parsed event (an associative
     * array). Pass the raw request body exactly as received (not re-encoded JSON), the request
     * headers (names compare case-insensitively and may be $_SERVER's HTTP_WEBHOOK_ID; values may
     * be lists, as PSR-7's getHeaders() returns them) and the endpoint's whsec_… signing secret.
     * Throws
     * WebhookVerificationException when the request must be rejected. The same check verifies
     * messages your own users receive from coss.com Hooks: pass that endpoint's secret.
     *
     * @param array<string, string|string[]> $headers
     * @return array<string, mixed>
     * @throws WebhookVerificationException
     */
    public static function verify(
        string $payload,
        array $headers,
        string $secret,
        int $toleranceSeconds = self::DEFAULT_TOLERANCE_SECONDS,
        ?int $now = null,
    ): array {
        self::verifySignature($payload, $headers, $secret, $toleranceSeconds, $now);
        try {
            $event = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new WebhookVerificationException('The webhook body is not valid JSON.');
        }
        if (!is_array($event)) {
            throw new WebhookVerificationException('The webhook body is not valid JSON.');
        }
        return $event;
    }

    /**
     * Checks a log drain request's signature and age, then returns its lines (the body is NDJSON:
     * one log line or audit event per line). The webhook-id header is the batch id, the same on
     * every retry of a batch: use it (or each line's id) to skip a batch you already stored.
     *
     * @param array<string, string|string[]> $headers
     * @return list<mixed>
     * @throws WebhookVerificationException
     */
    public static function verifyLogDrainBatch(
        string $payload,
        array $headers,
        string $secret,
        int $toleranceSeconds = self::DEFAULT_TOLERANCE_SECONDS,
        ?int $now = null,
    ): array {
        self::verifySignature($payload, $headers, $secret, $toleranceSeconds, $now);
        $lines = [];
        foreach (explode("\n", $payload) as $line) {
            if ($line === '') {
                continue;
            }
            try {
                $lines[] = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                throw new WebhookVerificationException('The log drain body is not valid NDJSON.');
            }
        }
        return $lines;
    }

    /**
     * @param array<string, string|string[]> $headers
     */
    private static function verifySignature(
        string $payload,
        array $headers,
        string $secret,
        int $toleranceSeconds,
        ?int $now,
    ): void {
        $id = self::header($headers, 'webhook-id');
        $timestamp = self::header($headers, 'webhook-timestamp');
        $signatures = self::header($headers, 'webhook-signature');
        if ($id === null || $id === '' || $timestamp === null || $timestamp === '' || $signatures === null || $signatures === '') {
            throw new WebhookVerificationException('Missing webhook-id, webhook-timestamp or webhook-signature.');
        }
        $now ??= time();
        if (preg_match('/\A[0-9]+\z/', $timestamp) !== 1 || abs($now - (int) $timestamp) > $toleranceSeconds) {
            throw new WebhookVerificationException('The webhook timestamp is too old or in the future.');
        }

        $encoded = str_starts_with($secret, self::SECRET_PREFIX) ? substr($secret, strlen(self::SECRET_PREFIX)) : $secret;
        $key = base64_decode($encoded, true);
        if ($key === false || $key === '') {
            throw new WebhookVerificationException('The signing secret is not a valid whsec_… secret.');
        }

        $expected = hash_hmac('sha256', "$id.$timestamp.$payload", $key, true);
        // Several space-separated signatures are sent while a secret is being rotated.
        foreach (explode(' ', $signatures) as $candidate) {
            $parts = explode(',', $candidate, 2);
            if (count($parts) !== 2 || $parts[0] !== 'v1' || $parts[1] === '') {
                continue;
            }
            $signature = base64_decode($parts[1], true);
            if ($signature !== false && hash_equals($expected, $signature)) {
                return;
            }
        }
        throw new WebhookVerificationException('No webhook signature matches.');
    }

    /**
     * @param array<string, string|string[]> $headers
     */
    private static function header(array $headers, string $name): ?string
    {
        foreach ($headers as $key => $value) {
            $normalized = str_replace('_', '-', strtolower((string) $key));
            if ($normalized !== $name && $normalized !== "http-$name") {
                continue;
            }
            if (is_array($value)) {
                $value = $value[0] ?? null;
            }
            return is_string($value) ? $value : null;
        }
        return null;
    }
}
