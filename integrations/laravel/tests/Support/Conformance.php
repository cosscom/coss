<?php

namespace Coss\Laravel\Tests\Support;

use Coss\Laravel\CossOptions;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Part\DataPart;

/**
 * Reads the shared scenarios in integrations/conformance (never copied into this package).
 */
final class Conformance
{
    public static function load(string $name): array
    {
        $path = dirname(__DIR__, 2).'/../conformance/'.$name.'.json';

        return json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    }

    /** A Symfony Email built from a message.json `input`. */
    public static function email(array $input): Email
    {
        $address = static fn (array $a) => new Address($a['address'], $a['name'] ?? '');
        $email = (new Email)
            ->from($address($input['from']))
            ->to(...array_map($address, $input['to']))
            ->subject($input['subject']);
        if (isset($input['cc'])) {
            $email->cc(...array_map($address, $input['cc']));
        }
        if (isset($input['bcc'])) {
            $email->bcc(...array_map($address, $input['bcc']));
        }
        if (isset($input['reply_to'])) {
            $email->replyTo(...array_map($address, $input['reply_to']));
        }
        if (isset($input['text'])) {
            $email->text($input['text']);
        }
        if (isset($input['html'])) {
            $email->html($input['html']);
        }
        foreach ($input['attachments'] ?? [] as $attachment) {
            $part = new DataPart(base64_decode($attachment['content_base64'], true), $attachment['filename'], $attachment['content_type'] ?? null);
            if (! empty($attachment['inline'])) {
                $part->asInline()->setContentId($attachment['content_id']);
            }
            $email->addPart($part);
        }
        foreach ($input['headers'] ?? [] as $name => $value) {
            if (strtolower($name) === 'message-id') {
                $email->getHeaders()->addIdHeader($name, trim($value, '<>'));
            } else {
                $email->getHeaders()->addTextHeader($name, $value);
            }
        }
        if (isset($input['coss'])) {
            CossOptions::apply($email, $input['coss']);
        }

        return $email;
    }

    /** A body with its header names lowercased, for comparing case-insensitively. */
    public static function normalizeBody(array $body): array
    {
        if (isset($body['headers'])) {
            $body['headers'] = array_change_key_case($body['headers'], CASE_LOWER);
        }

        return $body;
    }
}
