<?php

// Hand-written (listed in .fernignore): end to end against the API's test app.
//
//   bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
//   COSS_E2E='<that JSON>' composer test
//
// Skipped without COSS_E2E.

namespace Coss\Tests\Custom;

use Coss\Coss;
use Coss\Email\Requests\ListEmailRequest;
use Coss\Email\Requests\SendEmailBody;
use Coss\Exceptions\CossApiException;
use Coss\Types\SendEmailRequest;
use PHPUnit\Framework\TestCase;

final class E2eTest extends TestCase
{
    private Coss $coss;

    protected function setUp(): void
    {
        $raw = getenv('COSS_E2E');
        if ($raw === false || $raw === '') {
            $this->markTestSkipped('COSS_E2E is not set (see the file comment)');
        }
        $server = json_decode($raw, true);
        $this->coss = new Coss($server['sandbox_key'], options: ['baseUrl' => $server['base_url']]);
    }

    public function testSendGetAndList(): void
    {
        $email = $this->coss->email->send(new SendEmailBody(['body' => new SendEmailRequest([
            'from' => 'Acme <hello@acme.test>',
            'to' => ['ada@example.com'],
            'subject' => 'Hello from PHP',
            'text' => 'It works.',
        ])]));
        $this->assertStringStartsWith('email_', $email->id);
        $this->assertSame($email->id, $this->coss->email->get($email->id)->id);
        $this->assertCount(1, $this->coss->email->list(new ListEmailRequest(['limit' => 1]))->data);
    }

    public function testErrors(): void
    {
        try {
            $this->coss->email->send(new SendEmailBody(['body' => new SendEmailRequest([
                'from' => 'not an address',
                'to' => ['ada@example.com'],
                'text' => 'Hi',
            ])]));
            $this->fail('No CossApiException');
        } catch (CossApiException $e) {
            $this->assertSame(422, $e->getCode());
        }
        try {
            $this->coss->email->get('email_01k00000000000000000000000');
            $this->fail('No CossApiException');
        } catch (CossApiException $e) {
            $this->assertSame(404, $e->getCode());
        }
    }

    public function testReadsParse(): void
    {
        $this->coss->environment->get();
        $this->coss->reputation->get();
        $this->coss->billing->get();
        $this->coss->logs->list();
        $this->coss->auditEvents->list();
        $this->coss->domains->list();
        $this->coss->webhookEndpoints->list();
        $this->coss->email->suppressions->list();
        $this->coss->email->templates->list();
        $this->coss->email->contacts->list();
        $this->coss->email->tracking->get();
        $this->coss->hooks->applications->list();
        $this->coss->risk->settings->get();
        $this->coss->risk->rules->list();
        $this->addToAssertionCount(1);
    }
}
