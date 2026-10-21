<?php

// Hand-written (listed in .fernignore): integrations/conformance/webhooks.json, the cases every
// coss.com SDK runs.

namespace Coss\Tests\Custom;

use Coss\Webhooks;
use Coss\WebhookVerificationException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class WebhooksConformanceTest extends TestCase
{
    /** @return array<string, array{array<string, mixed>, array<string, mixed>}> */
    public static function cases(): array
    {
        $fixture = json_decode((string) file_get_contents(__DIR__ . '/../../../../integrations/conformance/webhooks.json'), true);
        $cases = [];
        foreach ($fixture['cases'] as $case) {
            $cases[$case['name']] = [$fixture, $case];
        }
        return $cases;
    }

    /**
     * @param array<string, mixed> $fixture
     * @param array<string, mixed> $case
     */
    #[DataProvider('cases')]
    public function testConformance(array $fixture, array $case): void
    {
        $settings = array_merge($fixture, array_intersect_key($case, array_flip(['secret', 'now', 'tolerance_seconds'])));
        $run = fn () => ($case['kind'] === 'log_drain' ? Webhooks::verifyLogDrainBatch(...) : Webhooks::verify(...))(
            $case['payload'],
            $case['headers'],
            $settings['secret'],
            $settings['tolerance_seconds'],
            $settings['now'],
        );
        if (isset($case['expect']['error'])) {
            try {
                $run();
                $this->fail('No WebhookVerificationException');
            } catch (WebhookVerificationException $e) {
                $this->assertSame($case['expect']['error'], $e->getMessage());
            }
        } else {
            $this->assertSame($case['expect']['value'], $run());
        }
    }
}
