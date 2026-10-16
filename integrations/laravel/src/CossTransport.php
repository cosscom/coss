<?php

namespace Coss\Laravel;

use Closure;
use Coss\Laravel\Exceptions\CossTransportException;
use Coss\Laravel\Exceptions\UnsupportedMessageException;
use Coss\Laravel\Http\CossClient;
use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Email;

/**
 * A Symfony Mailer transport (Laravel's `coss` mail transport) that sends every message with
 * `POST /v1/emails`. The sent message's id is the coss.com email id (`email_…`).
 */
class CossTransport extends AbstractTransport
{
    /** @var CossClient|Closure(): CossClient */
    private CossClient|Closure $client;

    /** @var array<string, mixed>|null */
    private ?array $lastEmail = null;

    /**
     * @param  CossClient|Closure(): CossClient  $client  A client, or a factory called on the first
     *                                                    send (so a missing API key fails that send, not the app's boot).
     */
    public function __construct(
        CossClient|Closure $client,
        ?EventDispatcherInterface $dispatcher = null,
        ?LoggerInterface $logger = null,
    ) {
        parent::__construct($dispatcher, $logger);
        $this->client = $client;
    }

    /**
     * The email as the API returned it for the last message this transport sent
     * (`['object' => 'email', 'id' => 'email_…', 'status' => 'queued', …]`).
     *
     * @return array<string, mixed>|null
     */
    public function getLastEmail(): ?array
    {
        return $this->lastEmail;
    }

    public function client(): CossClient
    {
        if ($this->client instanceof Closure) {
            $this->client = ($this->client)();
        }

        return $this->client;
    }

    public function __toString(): string
    {
        return 'coss';
    }

    /**
     * @throws CossTransportException when coss.com refuses or can't take the email.
     * @throws UnsupportedMessageException when the message uses something coss.com can't send.
     */
    protected function doSend(SentMessage $message): void
    {
        $email = $message->getOriginalMessage();
        if (! $email instanceof Email) {
            throw UnsupportedMessageException::because(
                'raw MIME messages ('.get_debug_type($email).') are not supported',
                'build a Symfony Email (or a Laravel Mailable) instead'
            );
        }

        ['body' => $body, 'idempotency_key' => $idempotencyKey] = MessageConverter::convert($email, $message->getEnvelope());
        $sent = $this->client()->sendEmail($body, $idempotencyKey);

        if (! is_string($sent['id'] ?? null)) {
            throw new CossTransportException(
                'api_error',
                'invalid_response',
                'The coss.com API returned an email without an id.',
            );
        }
        $this->lastEmail = $sent;
        $message->setMessageId($sent['id']);
        $message->appendDebug('coss.com email: '.json_encode($sent, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n");
    }
}
