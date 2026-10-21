// Hand-written (listed in .fernignore): the generated client's request behaviour (headers,
// retries, idempotency keys).
package com.coss.custom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.coss.Coss;
import com.coss.core.CossApiException;
import com.coss.resources.webhookendpoints.requests.CreateWebhookEndpointRequest;
import com.coss.types.SendEmailRequest;
import com.coss.types.SendEmailRequestTo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpServer;
import java.io.File;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ClientBehaviourTest {
    private HttpServer server;
    private final List<Headers> requests = Collections.synchronizedList(new ArrayList<>());

    /**
     * Answers each request with the next status; then 200 with the OpenAPI Email example. No
     * Retry-After: OkHttp itself retries a 503 with "Retry-After: 0" once.
     */
    private Coss fakeApi(Integer... statuses) throws Exception {
        String email = new ObjectMapper()
                .readTree(new File("../../apps/api/openapi.json"))
                .at("/components/schemas/Email/examples/0")
                .toString();
        List<Integer> queue = new ArrayList<>(Arrays.asList(statuses));
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requests.add(exchange.getRequestHeaders());
            int status = queue.isEmpty() ? 200 : queue.remove(0);
            String body = status >= 300
                    ? "{\"error\":{\"type\":\"api_error\",\"code\":\"x\",\"message\":\"No.\",\"request_id\":\"req_1\"}}"
                    : email;
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return Coss.builder()
                .apiKey("coss_test_key")
                .url("http://127.0.0.1:" + server.getAddress().getPort())
                .initialRetryDelayMillis(1)
                .build();
    }

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    @Test
    void sendsTheCossHeaders() throws Exception {
        fakeApi().email().get("email_1");
        Headers request = requests.get(0);
        String version = new String(Files.readAllBytes(Paths.get("../VERSION")), StandardCharsets.UTF_8).trim();
        assertEquals("Bearer coss_test_key", request.getFirst("Authorization"));
        assertEquals("coss-java/" + version, request.getFirst("User-Agent"));
        assertFalse(request.getFirst("Coss-Version").isEmpty());
    }

    @Test
    void retriesAPostWithOneIdempotencyKey() throws Exception {
        fakeApi(503, 409, 202)
                .email()
                .send(SendEmailRequest.builder()
                        .from("hello@acme.test")
                        .to(SendEmailRequestTo.of(Collections.singletonList("someone@example.com")))
                        .subject("Hi")
                        .text("Hi")
                        .build());
        assertEquals(3, requests.size());
        String key = requests.get(0).getFirst("Idempotency-Key");
        assertFalse(key == null || key.isEmpty());
        for (Headers request : requests) assertEquals(key, request.getFirst("Idempotency-Key"));
    }

    @ParameterizedTest
    @ValueSource(ints = {400, 402, 404, 422})
    void neverRetriesClientErrors(int status) throws Exception {
        Coss coss = fakeApi(status);
        CossApiException error = assertThrows(CossApiException.class, () -> coss.email().get("email_1"));
        assertEquals(status, error.statusCode());
        assertEquals(1, requests.size());
    }

    @Test
    void neverRetriesWhatTheApiDoesNotDeduplicate() throws Exception {
        Coss coss = fakeApi(503);
        assertThrows(CossApiException.class, () -> coss.webhookEndpoints()
                .create(CreateWebhookEndpointRequest.builder().url("https://example.com/hooks").build()));
        assertEquals(1, requests.size());
    }
}
