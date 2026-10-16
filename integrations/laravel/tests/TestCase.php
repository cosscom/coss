<?php

namespace Coss\Laravel\Tests;

use Coss\Laravel\CossClientFactory;
use Coss\Laravel\CossServiceProvider;
use Coss\Laravel\Tests\Support\FakeApi;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected FakeApi $api;

    /** @var list<float> */
    protected array $sleeps = [];

    protected float $random = 0.0;

    protected function setUp(): void
    {
        $this->api = new FakeApi;
        parent::setUp();
        $this->app->instance(CossClientFactory::class, new CossClientFactory(
            handler: $this->api,
            sleep: function (float $ms): void {
                $this->sleeps[] = $ms;
            },
            random: fn (): float => $this->random,
        ));
    }

    protected function getPackageProviders($app): array
    {
        return [CossServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('mail.default', 'coss');
        $app['config']->set('mail.mailers.coss', ['transport' => 'coss']);
        $app['config']->set('mail.from', ['address' => 'hello@acme.test', 'name' => 'Acme']);
        $app['config']->set('services.coss', [
            'key' => 'coss_test_conformance',
            'base_url' => 'https://api.coss.test/',
        ]);
        $app['config']->set('view.paths', [__DIR__.'/fixtures/views']);
    }
}
