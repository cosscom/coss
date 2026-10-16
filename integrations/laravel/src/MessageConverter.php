<?php

namespace Coss\Laravel;

use Coss\Laravel\Exceptions\UnsupportedMessageException;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\Header\MetadataHeader;
use Symfony\Component\Mailer\Header\TagHeader;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Header\DateHeader;
use Symfony\Component\Mime\Header\HeaderInterface;
use Symfony\Component\Mime\Header\IdentificationHeader;
use Symfony\Component\Mime\Header\MailboxHeader;
use Symfony\Component\Mime\Header\MailboxListHeader;
use Symfony\Component\Mime\Header\ParameterizedHeader;
use Symfony\Component\Mime\Header\PathHeader;
use Symfony\Component\Mime\Header\UnstructuredHeader;
use Symfony\Component\Mime\Message;
use Symfony\Component\Mime\Part\AbstractPart;
use Symfony\Component\Mime\Part\DataPart;

/**
 * Turns a Symfony Email (what Laravel's Mailables and notifications build) into the body of
 * `POST /v1/emails`, refusing what coss.com can't send.
 *
 * @internal
 */
final class MessageConverter
{
    /** The patterns Symfony uses to find `cid:` references in HTML (Email::prepareParts). */
    private const CID_PATTERNS = [
        '/<img\s+[^>]*src\s*=\s*(?:([\'"])cid:(.+?)\\1|cid:([^>\s]+))/i',
        '/<\w+\s+[^>]*background\s*=\s*(?:([\'"])cid:(.+?)\\1|cid:([^>\s]+))/i',
    ];

    /** The headers mapped to fields of their own (all of them reserved by the API anyway). */
    private const MAPPED_HEADERS = ['from', 'to', 'cc', 'bcc', 'reply-to', 'subject'];

    /**
     * @return array{body: array<string, mixed>, idempotency_key: string|null}
     *
     * @throws UnsupportedMessageException
     */
    public static function convert(Email $email, ?Envelope $envelope = null): array
    {
        // `setBody()` (a signed message, or a MIME tree built by hand) replaces what text(),
        // html() and attach() set, and Email::getBody() returns it; mapping those fields would
        // send something other than the message.
        if (self::explicitBody($email) !== null) {
            throw UnsupportedMessageException::because(
                'it has a MIME body set with setBody() (or a signed body)',
                'use text(), html(), attach() and embed() instead'
            );
        }

        $from = $email->getFrom();
        if (count($from) !== 1) {
            throw UnsupportedMessageException::because(
                count($from) === 0 ? 'it has no From address' : 'it has more than one From address',
                'give it exactly one'
            );
        }
        $fromAddress = $from[0];

        $body = ['from' => self::address($fromAddress)];
        foreach (['to' => $email->getTo(), 'cc' => $email->getCc(), 'bcc' => $email->getBcc(), 'reply_to' => $email->getReplyTo()] as $field => $addresses) {
            if ($addresses !== []) {
                $body[$field] = array_map(self::address(...), $addresses);
            }
        }
        $body['subject'] = $email->getSubject() ?? '';

        $html = self::content($email->getHtmlBody(), $email->getHtmlCharset());
        if ($html !== null && $html !== '') {
            $body['html'] = $html;
        }
        $text = self::content($email->getTextBody(), $email->getTextCharset());
        if ($text !== null && $text !== '') {
            $body['text'] = $text;
        }

        $attachments = self::attachments($email->getAttachments(), $html ?? '');
        if ($attachments !== []) {
            $body['attachments'] = $attachments;
        }

        [$headers, $tagHeaders, $metadata] = self::headers($email, $fromAddress);
        if ($headers !== []) {
            $body['headers'] = $headers;
        }

        if ($envelope !== null) {
            self::checkEnvelope($envelope, $fromAddress, [...$email->getTo(), ...$email->getCc(), ...$email->getBcc()]);
        }

        $options = CossOptions::from($email)?->toArray() ?? [];
        if (count($tagHeaders) > 1) {
            throw UnsupportedMessageException::because(
                'it has '.count($tagHeaders).' tags (`tag()`), and coss.com files an email under one category',
                'give it one tag, or a `category` with coss()'
            );
        }
        $category = $options['category'] ?? $tagHeaders[0] ?? null;
        if ($category !== null && $category !== '') {
            $body['category'] = $category;
        }

        // Metadata first, then coss() tags, which replace metadata of the same name in place.
        $tags = [];
        foreach ([...$metadata, ...($options['tags'] ?? [])] as $tag) {
            $tags[$tag['name']] = $tag;
        }
        if ($tags !== []) {
            $body['tags'] = array_values($tags);
        }
        if (isset($options['scheduled_at'])) {
            $body['scheduled_at'] = $options['scheduled_at'];
        }
        if (! empty($options['tracking'])) {
            $body['tracking'] = $options['tracking'];
        }

        return ['body' => $body, 'idempotency_key' => $options['idempotency_key'] ?? null];
    }

    private static function address(Address $address): string
    {
        return Mime::formatAddress($address->getAddress(), $address->getName());
    }

    /**
     * A body as a UTF-8 string: resources are read (rewound first when they can be).
     *
     * @param  resource|string|null  $content
     */
    private static function content(mixed $content, ?string $charset): ?string
    {
        if ($content === null) {
            return null;
        }
        if (is_resource($content)) {
            if (stream_get_meta_data($content)['seekable'] ?? false) {
                rewind($content);
            }
            $content = stream_get_contents($content);
            if ($content === false) {
                throw UnsupportedMessageException::because('its body could not be read', 'pass the body as a string');
            }
        }
        $charset = strtolower($charset ?? 'utf-8');
        if ($charset !== 'utf-8' && $charset !== 'utf8') {
            $content = mb_convert_encoding($content, 'UTF-8', $charset);
        }

        return $content;
    }

    /**
     * @param  DataPart[]  $parts
     * @return list<array{filename: string, content: string, content_type?: string, content_id?: string}>
     */
    private static function attachments(array $parts, string $html): array
    {
        $references = [];
        if ($html !== '') {
            foreach (self::CID_PATTERNS as $pattern) {
                preg_match_all($pattern, $html, $matches);
                $references = [...$references, ...$matches[2], ...$matches[3]];
            }
            $references = array_values(array_filter(array_unique($references), static fn ($name) => $name !== ''));
        }

        $attachments = [];
        foreach (array_values($parts) as $index => $part) {
            $filename = $part->getFilename();
            $attachment = [
                'filename' => $filename === null || $filename === '' ? 'attachment-'.($index + 1) : $filename,
                'content' => base64_encode($part->getBody()),
            ];
            $contentType = Mime::mediaType($part->getMediaType().'/'.$part->getMediaSubtype());
            if ($contentType !== null) {
                $attachment['content_type'] = $contentType;
            }
            $contentId = self::contentId($part, $references);
            if ($contentId !== null) {
                $attachment['content_id'] = $contentId;
            }
            $attachments[] = $attachment;
        }

        return $attachments;
    }

    /**
     * The Content-ID the HTML refers to the part by. Symfony lets HTML refer to an attachment by
     * its Content-ID or by its name (`cid:logo.png`, rewritten in the MIME message it builds); the
     * HTML goes to coss.com as it is, so the reference it uses becomes the content id.
     *
     * @param  list<string>  $references
     */
    private static function contentId(DataPart $part, array $references): ?string
    {
        if ($part->hasContentId() && in_array($part->getContentId(), $references, true)) {
            return Mime::bareContentId($part->getContentId());
        }
        $name = $part->getName();
        if ($name !== null && in_array($name, $references, true)) {
            return Mime::bareContentId($name);
        }
        if ($part->hasContentId() || $part->getDisposition() === 'inline') {
            return Mime::bareContentId($part->getContentId());
        }

        return null;
    }

    /**
     * Custom headers (reserved ones dropped, values encoded), plus the values of Laravel's tag
     * and metadata headers, which become `category` and `tags`.
     *
     * @return array{0: array<string, string>, 1: list<string>, 2: list<array{name: string, value: string}>}
     */
    private static function headers(Email $email, Address $from): array
    {
        $headers = [];
        $tags = [];
        $metadata = [];
        $seen = [];
        foreach ($email->getHeaders()->all() as $header) {
            $name = $header->getName();
            $lower = strtolower(trim($name));
            if ($header instanceof CossOptions) {
                continue;
            }
            if ($header instanceof TagHeader) {
                $tags[] = $header->getValue();

                continue;
            }
            if ($header instanceof MetadataHeader) {
                $metadata[] = ['name' => $header->getKey(), 'value' => $header->getValue()];

                continue;
            }
            if (in_array($lower, self::MAPPED_HEADERS, true)) {
                continue;
            }
            if ($lower === 'sender' || $lower === 'return-path') {
                // Harmless when it names the From address; anything else is a separate envelope.
                $address = $header instanceof MailboxHeader || $header instanceof PathHeader ? $header->getAddress()->getAddress() : null;
                if ($address === null || strcasecmp($address, $from->getAddress()) !== 0) {
                    throw UnsupportedMessageException::because(
                        $lower === 'sender'
                            ? 'it has a Sender header'
                            : 'its Return-Path differs from the From address',
                        'coss.com sets the envelope sender itself; leave it out'
                    );
                }

                continue;
            }
            if (Mime::isReservedHeader($name)) {
                continue;
            }
            $value = Mime::encodeHeaderValue(self::headerValue($header));
            if ($value === '') {
                continue;
            }
            if (isset($seen[$lower])) {
                throw UnsupportedMessageException::because(
                    "the {$name} header is given more than once",
                    'coss.com sends each header once'
                );
            }
            $seen[$lower] = true;
            $headers[trim($name)] = $value;
        }

        return [$headers, $tags, $metadata];
    }

    /** A header's value before MIME encoding (the API takes UTF-8 and the driver encodes it). */
    private static function headerValue(HeaderInterface $header): string
    {
        return match (true) {
            $header instanceof ParameterizedHeader => $header->getBodyAsString(),
            $header instanceof UnstructuredHeader => $header->getValue(),
            $header instanceof IdentificationHeader => implode(' ', array_map(static fn (string $id) => "<{$id}>", $header->getIds())),
            $header instanceof MailboxListHeader => implode(', ', array_map(self::address(...), $header->getAddresses())),
            $header instanceof MailboxHeader => self::address($header->getAddress()),
            $header instanceof PathHeader => '<'.$header->getAddress()->getAddress().'>',
            $header instanceof DateHeader => $header->getDateTime()->format(\DATE_RFC2822),
            default => $header->getBodyAsString(),
        };
    }

    /**
     * coss.com sends from the From address to the message's recipients: an envelope that says
     * otherwise is refused rather than ignored.
     *
     * @param  Address[]  $recipients
     */
    private static function checkEnvelope(Envelope $envelope, Address $from, array $recipients): void
    {
        if (strcasecmp($envelope->getSender()->getAddress(), $from->getAddress()) !== 0) {
            throw UnsupportedMessageException::because(
                'its envelope sender ('.$envelope->getSender()->getAddress().') differs from the From address',
                'coss.com sends from the From address'
            );
        }
        $normalize = static function (array $addresses): array {
            $list = array_map(static fn (Address $address) => strtolower($address->getAddress()), $addresses);
            sort($list);

            return array_values(array_unique($list));
        };
        if ($normalize($envelope->getRecipients()) !== $normalize($recipients)) {
            throw UnsupportedMessageException::because(
                'its envelope recipients differ from its To, Cc and Bcc addresses',
                'coss.com sends to the message\'s recipients; put them in To, Cc or Bcc'
            );
        }
    }

    /** The body set with `Message::setBody()`, which Email::getBody() prefers over its fields. */
    private static function explicitBody(Email $email): ?AbstractPart
    {
        return (new \ReflectionProperty(Message::class, 'body'))->getValue($email);
    }
}
