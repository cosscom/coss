// Hand-written (listed in .fernignore): integrations/conformance/webhooks.json, the cases every
// coss.com SDK runs.
package com.coss.custom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.coss.WebhookVerificationException;
import com.coss.Webhooks;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

class WebhooksConformanceTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @TestFactory
    Stream<DynamicTest> conformance() throws Exception {
        JsonNode fixture = MAPPER.readTree(new File("../../integrations/conformance/webhooks.json"));
        return StreamSupport.stream(fixture.get("cases").spliterator(), false)
                .map(c -> DynamicTest.dynamicTest(c.get("name").asText(), () -> run(fixture, c)));
    }

    private static void run(JsonNode fixture, JsonNode c) {
        Map<String, String> headers = new LinkedHashMap<>();
        c.get("headers").fields().forEachRemaining(e -> headers.put(e.getKey(), e.getValue().asText()));
        String secret = (c.has("secret") ? c : fixture).get("secret").asText();
        Instant now = Instant.ofEpochSecond((c.has("now") ? c : fixture).get("now").asLong());
        Duration tolerance =
                Duration.ofSeconds((c.has("tolerance_seconds") ? c : fixture).get("tolerance_seconds").asLong());
        String payload = c.get("payload").asText();
        boolean logDrain = c.get("kind").asText().equals("log_drain");
        JsonNode expect = c.get("expect");

        if (expect.has("error")) {
            WebhookVerificationException error = assertThrows(WebhookVerificationException.class, () -> {
                if (logDrain) {
                    Webhooks.verifyLogDrainBatch(payload, headers, secret, tolerance, now);
                } else {
                    Webhooks.verify(payload, headers, secret, tolerance, now);
                }
            });
            assertEquals(expect.get("error").asText(), error.getMessage());
        } else if (logDrain) {
            assertEquals(expect.get("value"), MAPPER.valueToTree(Webhooks.verifyLogDrainBatch(payload, headers, secret, tolerance, now)));
        } else {
            assertEquals(expect.get("value"), Webhooks.verify(payload, headers, secret, tolerance, now));
        }
    }
}
