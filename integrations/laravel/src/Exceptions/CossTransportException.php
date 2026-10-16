<?php

namespace Coss\Laravel\Exceptions;

use Symfony\Component\Mailer\Exception\TransportException;

/**
 * coss.com refused or couldn't take the email: an API error, a network error or a timeout (after
 * the client's retries). The fields mirror the API's error envelope.
 */
class CossTransportException extends TransportException implements CossException
{
    /** The error types the API sends; anything else is read as `api_error`. */
    public const API_ERROR_TYPES = [
        'invalid_request_error',
        'authentication_error',
        'permission_error',
        'not_found_error',
        'idempotency_error',
        'rate_limit_error',
        'billing_error',
        'api_error',
    ];

    /**
     * @param  list<array{path: string, message: string}>|null  $issues
     */
    public function __construct(
        private readonly string $type,
        private readonly string $errorCode,
        private readonly string $errorMessage,
        private readonly ?int $status = null,
        private readonly ?string $requestId = null,
        private readonly ?string $param = null,
        private readonly ?array $issues = null,
        ?\Throwable $previous = null,
    ) {
        $message = "coss.com could not send the email: {$errorMessage} ({$errorCode})";
        if ($issues) {
            $message .= ' '.implode('; ', array_map(
                static fn (array $issue): string => "{$issue['path']}: {$issue['message']}",
                $issues,
            ));
        }

        parent::__construct($message, 0, $previous);
    }

    /**
     * Builds the error for a non-2xx response. A body that isn't the API's error envelope (a
     * proxy's HTML 502, an empty 503) becomes `api_error` / `unexpected_response`.
     */
    public static function fromResponse(int $status, string $body, ?string $headerRequestId): self
    {
        $decoded = json_decode($body, true);
        $envelope = self::isRecord($decoded) ? ($decoded['error'] ?? null) : null;

        if (! self::isRecord($envelope) || ! is_string($envelope['message'] ?? null)) {
            return new self(
                'api_error',
                'unexpected_response',
                "The coss.com API returned an unexpected HTTP {$status} response.",
                $status,
                $headerRequestId,
            );
        }

        $type = $envelope['type'] ?? null;
        $issues = null;
        if (is_array($envelope['issues'] ?? null) && array_is_list($envelope['issues'])) {
            $issues = [];
            foreach ($envelope['issues'] as $issue) {
                if (self::isRecord($issue) && is_string($issue['path'] ?? null) && is_string($issue['message'] ?? null)) {
                    $issues[] = ['path' => $issue['path'], 'message' => $issue['message']];
                }
            }
        }

        return new self(
            is_string($type) && in_array($type, self::API_ERROR_TYPES, true) ? $type : 'api_error',
            is_string($envelope['code'] ?? null) ? $envelope['code'] : 'unknown_error',
            $envelope['message'],
            $status,
            is_string($envelope['request_id'] ?? null) ? $envelope['request_id'] : $headerRequestId,
            is_string($envelope['param'] ?? null) ? $envelope['param'] : null,
            $issues,
        );
    }

    /** e.g. `invalid_request_error`, `rate_limit_error`, `connection_error`, `timeout_error`. */
    public function getType(): string
    {
        return $this->type;
    }

    /** The machine-readable reason, e.g. `domain_not_verified` (getCode() is Symfony's integer). */
    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    /** The API's own message, without the "coss.com could not send the email" prefix. */
    public function getErrorMessage(): string
    {
        return $this->errorMessage;
    }

    /** The HTTP status, or null when no response was received (network errors, timeouts). */
    public function getStatus(): ?int
    {
        return $this->status;
    }

    /** The API request id (`req_…`) to quote to support, or null when unknown. */
    public function getRequestId(): ?string
    {
        return $this->requestId;
    }

    /** The request field the error is about, when the API names one. */
    public function getParam(): ?string
    {
        return $this->param;
    }

    /**
     * Field-level validation problems, when the API sent them.
     *
     * @return list<array{path: string, message: string}>|null
     */
    public function getIssues(): ?array
    {
        return $this->issues;
    }

    /**
     * The error as the API's envelope would carry it.
     *
     * @return array{type: string, code: string, message: string, status: ?int, request_id: ?string, param?: string, issues?: list<array{path: string, message: string}>}
     */
    public function toArray(): array
    {
        $error = [
            'type' => $this->type,
            'code' => $this->errorCode,
            'message' => $this->errorMessage,
            'status' => $this->status,
            'request_id' => $this->requestId,
        ];
        if ($this->param !== null) {
            $error['param'] = $this->param;
        }
        if ($this->issues !== null) {
            $error['issues'] = $this->issues;
        }

        return $error;
    }

    private static function isRecord(mixed $value): bool
    {
        return is_array($value) && ($value === [] || ! array_is_list($value));
    }
}
