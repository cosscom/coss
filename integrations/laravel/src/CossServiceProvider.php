<?php

namespace Coss\Laravel;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Mail\MailManager;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the `coss` mail transport (auto-discovered):
 *
 *     // config/mail.php
 *     'mailers' => ['coss' => ['transport' => 'coss']],
 *     // config/services.php
 *     'coss' => ['key' => env('COSS_API_KEY')],
 *
 * then set `MAIL_MAILER=coss`.
 */
class CossServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singletonIf(CossClientFactory::class);
    }

    public function boot(): void
    {
        $this->callAfterResolving('mail.manager', function (MailManager $manager, Application $app): void {
            $manager->extend('coss', static function (array $config) use ($app): CossTransport {
                // The client is created on the first send, so a missing API key fails that send
                // (with a message naming where to set it), never the app's boot.
                return new CossTransport(static fn () => $app->make(CossClientFactory::class)->make(
                    $config,
                    (array) $app['config']->get('services.coss', []),
                ));
            });
        });
    }
}
