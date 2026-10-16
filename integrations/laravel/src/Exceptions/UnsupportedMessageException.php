<?php

namespace Coss\Laravel\Exceptions;

use Symfony\Component\Mailer\Exception\LogicException;

/**
 * The message uses something coss.com can't send (a raw MIME message, a separate envelope, a
 * Sender header, a header given twice …). It is refused rather than sent with parts dropped.
 */
class UnsupportedMessageException extends LogicException implements CossException
{
    public static function because(string $what, string $instead): self
    {
        return new self("coss.com can't send this email: {$what}; {$instead}.");
    }
}
