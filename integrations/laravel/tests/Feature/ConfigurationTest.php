<?php

namespace Coss\Laravel\Tests\Feature;

use Coss\Laravel\CossTransport;
use Coss\Laravel\Exceptions\MissingApiKeyException;
use Coss\Laravel\Tests\Support\FakeApi;
use Coss\Laravel\Tests\Support\Mail\WelcomeMail;
use Coss\Laravel\Tests\TestCase;
use Illuminate\Support\Facades\Mail;

final class ConfigurationTest extends TestCase
{
    protected function tearDown(): void
    {
        putenv('COSS_API_KEY');
        unset($_ENV['COSS_API_KEY'], $_SERVER['COSS_API_KEY']);
        parent::tearDown();
    }

    public function test_a_missing_key_fails_the_send_not_the_boot(): void
    {
        config()->set('services.coss', []);

        // Resolving the mailer (what the app does while booting or queueing) is fine …
        $transport = Mail::mailer('coss')->getSymfonyTransport();
        $this->assertInstanceOf(CossTransport::class, $transport);

        // … the send fails, naming where the key goes.
        try {
            Mail::to('ada@example.com')->send(new WelcomeMail);
            $this->fail('The send should fail.');
        } catch (MissingApiKeyException $exception) {
            $this->assertStringContainsString('COSS_API_KEY', $exception->getMessage());
            $this->assertStringContainsString('services.coss.key', $exception->getMessage());
        }
        $this->assertSame([], $this->api->requests);
    }

    public function test_the_key_falls_back_to_the_environment(): void
    {
        config()->set('services.coss', ['base_url' => 'https://api.coss.test']);
        putenv('COSS_API_KEY=coss_test_from_env');
        $this->api->push(FakeApi::email());

        Mail::to('ada@example.com')->send(new WelcomeMail);

        $this->assertSame('Bearer coss_test_from_env', $this->api->requests[0]->getHeaderLine('Authorization'));
    }

    public function test_the_default_base_url(): void
    {
        config()->set('services.coss', ['key' => 'coss_test_conformance']);
        $this->api->push(FakeApi::email());

        Mail::to('ada@example.com')->send(new WelcomeMail);

        $this->assertSame('https://api.coss.com/v1/emails', (string) $this->api->requests[0]->getUri());
    }
}
