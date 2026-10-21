// Hand-written (listed in .fernignore): verifies coss.com webhook and log drain requests (Standard
// Webhooks signatures), like the TypeScript SDK's verifyWebhook and verifyLogDrainBatch.
package com.coss;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class Webhooks {
    private static final String SECRET_PREFIX = "whsec_";
    private static final Duration DEFAULT_TOLERANCE = Duration.ofMinutes(5);
    private static final Pattern TIMESTAMP = Pattern.compile("[0-9]+");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Webhooks() {}

    /**
     * Checks the request's signature and age, then returns the parsed event. Pass the raw request
     * body exactly as received (not re-serialized JSON), the request headers (names compare
     * case-insensitively; a value may be a String or a collection of them) and the endpoint's
     * {@code whsec_…} signing secret. Throws {@link WebhookVerificationException} when the request
     * must be rejected. The same check verifies messages your own users receive from coss.com
     * Hooks: pass that endpoint's secret.
     */
    public static JsonNode verify(String payload, Map<String, ?> headers, String secret) {
        return verify(payload, headers, secret, DEFAULT_TOLERANCE, Instant.now());
    }

    /** {@link #verify(String, Map, String)} with a timestamp tolerance and the current time. */
    public static JsonNode verify(
            String payload, Map<String, ?> headers, String secret, Duration tolerance, Instant now) {
        verifySignature(payload, headers, secret, tolerance, now);
        try {
            return MAPPER.readTree(payload);
        } catch (Exception e) {
            throw new WebhookVerificationException("The webhook body is not valid JSON.");
        }
    }

    /**
     * Checks a log drain request's signature and age, then returns its lines (the body is NDJSON:
     * one log line or audit event per line). The {@code webhook-id} header is the batch id, the
     * same on every retry of a batch: use it (or each line's id) to skip a batch you already
     * stored.
     */
    public static List<JsonNode> verifyLogDrainBatch(String payload, Map<String, ?> headers, String secret) {
        return verifyLogDrainBatch(payload, headers, secret, DEFAULT_TOLERANCE, Instant.now());
    }

    /** {@link #verifyLogDrainBatch(String, Map, String)} with a tolerance and the current time. */
    public static List<JsonNode> verifyLogDrainBatch(
            String payload, Map<String, ?> headers, String secret, Duration tolerance, Instant now) {
        verifySignature(payload, headers, secret, tolerance, now);
        List<JsonNode> lines = new ArrayList<>();
        for (String line : payload.split("\n", -1)) {
            if (line.isEmpty()) {
                continue;
            }
            try {
                lines.add(MAPPER.readTree(line));
            } catch (Exception e) {
                throw new WebhookVerificationException("The log drain body is not valid NDJSON.");
            }
        }
        return lines;
    }

    private static void verifySignature(
            String payload, Map<String, ?> headers, String secret, Duration tolerance, Instant now) {
        String id = header(headers, "webhook-id");
        String timestamp = header(headers, "webhook-timestamp");
        String signatures = header(headers, "webhook-signature");
        if (isEmpty(id) || isEmpty(timestamp) || isEmpty(signatures)) {
            throw new WebhookVerificationException("Missing webhook-id, webhook-timestamp or webhook-signature.");
        }
        if (!TIMESTAMP.matcher(timestamp).matches()
                || timestamp.length() > 18
                || Math.abs(now.getEpochSecond() - Long.parseLong(timestamp)) > tolerance.getSeconds()) {
            throw new WebhookVerificationException("The webhook timestamp is too old or in the future.");
        }

        byte[] key = decodeBase64(secret.startsWith(SECRET_PREFIX) ? secret.substring(SECRET_PREFIX.length()) : secret);
        if (key == null || key.length == 0) {
            throw new WebhookVerificationException("The signing secret is not a valid whsec_… secret.");
        }
        byte[] expected;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            expected = mac.doFinal((id + "." + timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
        // Several space-separated signatures are sent while a secret is being rotated.
        for (String candidate : signatures.split(" ")) {
            int comma = candidate.indexOf(',');
            if (comma < 0 || !candidate.substring(0, comma).equals("v1") || comma == candidate.length() - 1) {
                continue;
            }
            byte[] signature = decodeBase64(candidate.substring(comma + 1));
            if (signature != null && MessageDigest.isEqual(signature, expected)) {
                return;
            }
        }
        throw new WebhookVerificationException("No webhook signature matches.");
    }

    private static String header(Map<String, ?> headers, String name) {
        for (Map.Entry<String, ?> entry : headers.entrySet()) {
            if (!entry.getKey().toLowerCase(Locale.ROOT).equals(name)) {
                continue;
            }
            Object value = entry.getValue();
            if (value instanceof Collection) {
                Collection<?> values = (Collection<?>) value;
                value = values.isEmpty() ? null : values.iterator().next();
            }
            return value instanceof String ? (String) value : null;
        }
        return null;
    }

    private static byte[] decodeBase64(String value) {
        try {
            return Base64.getDecoder().decode(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static boolean isEmpty(String value) {
        return value == null || value.isEmpty();
    }
}
