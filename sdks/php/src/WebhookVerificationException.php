<?php

// Hand-written (listed in .fernignore).

namespace Coss;

use RuntimeException;

/** A webhook request failed verification: reject it (e.g. respond 400). */
final class WebhookVerificationException extends RuntimeException
{
}
