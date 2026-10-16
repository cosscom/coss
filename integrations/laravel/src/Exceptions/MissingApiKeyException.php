<?php

namespace Coss\Laravel\Exceptions;

use Symfony\Component\Mailer\Exception\LogicException;

/**
 * No API key is configured. Thrown by the first send, never while the app boots.
 */
class MissingApiKeyException extends LogicException implements CossException
{
    public static function make(): self
    {
        return new self(
            'coss.com could not send the email: no API key is configured. Set the COSS_API_KEY '
            .'environment variable, or `key` under `services.coss` (services.coss.key in '
            .'config/services.php) or on the coss mailer in config/mail.php.'
        );
    }
}
