<?php

namespace Coss\Laravel;

use DateTimeInterface;
use DateTimeZone;
use InvalidArgumentException;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Header\AbstractHeader;

/**
 * coss.com's own fields for one message: `category`, `tags`, `scheduled_at`, `tracking` and
 * `idempotency_key`. It rides on the Symfony message as a header that the coss transport reads
 * and removes, so it is never sent as a header.
 *
 *     // A notification's MailMessage (or any Symfony Email):
 *     (new MailMessage)->withSymfonyMessage(
 *         fn (Email $message) => CossOptions::apply($message, ['category' => 'account'])
 *     );
 *
 * Mailables use the `Coss\Laravel\Concerns\SendsWithCoss` trait's `coss()` instead.
 */
final class CossOptions extends AbstractHeader
{
    public const HEADER_NAME = 'X-Coss-Options';

    private const KEYS = ['category', 'tags', 'scheduled_at', 'tracking', 'idempotency_key'];

    private const TRACKING_KEYS = ['opens', 'clicks', 'unsubscribe'];

    /** @var array<string, mixed> */
    private array $options = [];

    /**
     * @param  array<string, mixed>  $options
     */
    public function __construct(array $options = [])
    {
        parent::__construct(self::HEADER_NAME);
        $this->setBody($options);
    }

    /**
     * Adds coss.com options to a message, merged over any it already has (a key given again
     * replaces the earlier value; `null` removes it).
     *
     * @param  array{category?: string|null, tags?: array<string, string>|list<array{name: string, value: string}>|null, scheduled_at?: DateTimeInterface|string|null, tracking?: array{opens?: bool, clicks?: bool, unsubscribe?: bool}|null, idempotency_key?: string|null}  $options
     *
     * @throws InvalidArgumentException for an unknown key or a value of the wrong type.
     */
    public static function apply(Email $message, array $options): Email
    {
        $headers = $message->getHeaders();
        $merged = self::from($message)?->toArray() ?? [];
        foreach (self::normalize($options) as $key => $value) {
            if ($value === null) {
                unset($merged[$key]);
            } else {
                $merged[$key] = $value;
            }
        }
        $headers->remove(self::HEADER_NAME);
        if ($merged !== []) {
            $headers->add(new self($merged));
        }

        return $message;
    }

    /** The options on a message, if any. */
    public static function from(Email $message): ?self
    {
        foreach ($message->getHeaders()->all(self::HEADER_NAME) as $header) {
            if ($header instanceof self) {
                return $header;
            }
        }

        return null;
    }

    /**
     * Checks options and puts them in the form the API takes: tags as a list of
     * `{ name, value }`, `scheduled_at` as a UTC `YYYY-MM-DDTHH:MM:SSZ` string.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public static function normalize(array $options): array
    {
        $normalized = [];
        foreach ($options as $key => $value) {
            if (! in_array($key, self::KEYS, true)) {
                throw new InvalidArgumentException(sprintf(
                    'Unknown coss.com option "%s"; use %s.',
                    $key,
                    implode(', ', self::KEYS),
                ));
            }
            $normalized[$key] = $value === null ? null : match ($key) {
                'category' => self::nonEmptyString($key, $value),
                'idempotency_key' => self::nonEmptyString($key, $value),
                'tags' => self::tags($value),
                'scheduled_at' => self::scheduledAt($value),
                'tracking' => self::tracking($value),
            };
        }

        return $normalized;
    }

    /**
     * @return array{category?: string, tags?: list<array{name: string, value: string}>, scheduled_at?: string, tracking?: array<string, bool>, idempotency_key?: string}
     */
    public function toArray(): array
    {
        return $this->options;
    }

    public function setBody(mixed $body): void
    {
        if (! is_array($body)) {
            throw new InvalidArgumentException('coss.com options must be an array.');
        }
        $this->options = array_filter(self::normalize($body), static fn ($value) => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    public function getBody(): mixed
    {
        return $this->options;
    }

    /** Only shown if another transport (e.g. a failover mailer's SMTP) sends the message. */
    public function getBodyAsString(): string
    {
        return json_encode($this->options, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) ?: '{}';
    }

    private static function nonEmptyString(string $key, mixed $value): string
    {
        if (! is_string($value) || trim($value) === '') {
            throw new InvalidArgumentException("The coss.com option \"{$key}\" must be a non-empty string.");
        }

        return $value;
    }

    /**
     * @return list<array{name: string, value: string}>
     */
    private static function tags(mixed $value): array
    {
        if (! is_array($value)) {
            throw new InvalidArgumentException('coss.com tags must be a map (["plan" => "pro"]) or a list of ["name" => …, "value" => …].');
        }
        $tags = [];
        if (array_is_list($value)) {
            foreach ($value as $tag) {
                if (! is_array($tag) || array_keys($tag) !== ['name', 'value'] && array_keys($tag) !== ['value', 'name']) {
                    throw new InvalidArgumentException('A coss.com tag in a list must be ["name" => …, "value" => …].');
                }
                $tags[] = ['name' => self::tagPart('name', $tag['name']), 'value' => self::tagPart('value', $tag['value'])];
            }

            return $tags;
        }
        foreach ($value as $name => $tagValue) {
            $tags[] = ['name' => self::tagPart('name', $name), 'value' => self::tagPart('value', $tagValue)];
        }

        return $tags;
    }

    private static function tagPart(string $what, mixed $value): string
    {
        if (is_string($value) || is_int($value) || is_float($value)) {
            return (string) $value;
        }

        throw new InvalidArgumentException("A coss.com tag's {$what} must be a string.");
    }

    private static function scheduledAt(mixed $value): string
    {
        if ($value instanceof DateTimeInterface) {
            return \DateTimeImmutable::createFromInterface($value)
                ->setTimezone(new DateTimeZone('UTC'))
                ->format('Y-m-d\TH:i:s\Z');
        }

        return self::nonEmptyString('scheduled_at', $value);
    }

    /**
     * @return array<string, bool>
     */
    private static function tracking(mixed $value): array
    {
        if (! is_array($value) || array_is_list($value) && $value !== []) {
            throw new InvalidArgumentException('coss.com tracking must be ["opens" => bool, "clicks" => bool, "unsubscribe" => bool].');
        }
        foreach ($value as $key => $enabled) {
            if (! in_array($key, self::TRACKING_KEYS, true)) {
                throw new InvalidArgumentException(sprintf('Unknown coss.com tracking option "%s"; use %s.', $key, implode(', ', self::TRACKING_KEYS)));
            }
            if (! is_bool($enabled)) {
                throw new InvalidArgumentException("The coss.com tracking option \"{$key}\" must be a boolean.");
            }
        }

        return $value;
    }
}
