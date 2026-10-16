<?php

namespace Coss\Laravel\Concerns;

use Coss\Laravel\CossOptions;
use Illuminate\Mail\Mailable;
use Symfony\Component\Mime\Email;

/**
 * Adds `coss()` to a Mailable: coss.com's own fields for the message.
 *
 *     Mail::to($user)->send((new OrderShipped($order))->coss([
 *         'category' => 'receipts',
 *         'tags' => ['plan' => 'pro'],
 *         'scheduled_at' => now()->addHour(),
 *         'tracking' => ['opens' => true, 'clicks' => false],
 *         'idempotency_key' => "order-{$order->id}-shipped",
 *     ]));
 *
 * The options are kept on the mailable (so queued mailables keep them) and added to the Symfony
 * message when it is built. `category` and `tags` win over the mailable's `tag()` and
 * `metadata()`.
 *
 * @mixin Mailable
 */
trait SendsWithCoss
{
    /**
     * The coss.com options given to coss(), already checked.
     *
     * @var array<string, mixed>
     */
    public array $cossOptions = [];

    /**
     * Sets coss.com options; calling it again merges (a key given again replaces the earlier
     * value, `null` removes it).
     *
     * @param  array{category?: string|null, tags?: array<string, string>|list<array{name: string, value: string}>|null, scheduled_at?: \DateTimeInterface|string|null, tracking?: array{opens?: bool, clicks?: bool, unsubscribe?: bool}|null, idempotency_key?: string|null}  $options
     *
     * @throws \InvalidArgumentException for an unknown key or a value of the wrong type.
     */
    public function coss(array $options): static
    {
        $first = $this->cossOptions === [] && ! $this->hasCossCallback();
        $this->cossOptions = array_merge($this->cossOptions, CossOptions::normalize($options));
        if ($first) {
            // A method callable rather than a closure, so the mailable can still be queued.
            $this->withSymfonyMessage([$this, 'applyCossOptions']);
        }

        return $this;
    }

    /**
     * @internal Called by the mailable while it builds the Symfony message.
     */
    public function applyCossOptions(Email $message): void
    {
        CossOptions::apply($message, $this->cossOptions);
    }

    private function hasCossCallback(): bool
    {
        foreach ($this->callbacks as $callback) {
            if (is_array($callback) && ($callback[1] ?? null) === 'applyCossOptions') {
                return true;
            }
        }

        return false;
    }
}
