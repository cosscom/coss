// Hand-written (listed in .fernignore): end to end against the API's test app.
//
//   bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
//   COSS_E2E='<that JSON>' ./gradlew test
//
// Skipped without COSS_E2E.
package com.coss.custom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.coss.Coss;
import com.coss.errors.NotFoundError;
import com.coss.errors.UnprocessableEntityError;
import com.coss.resources.email.requests.ListEmailRequest;
import com.coss.types.Email;
import com.coss.types.SendEmailRequest;
import com.coss.types.SendEmailRequestTo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class E2eTest {
    private Coss coss;

    @BeforeEach
    void client() throws Exception {
        String raw = System.getenv("COSS_E2E");
        assumeTrue(raw != null && !raw.isEmpty(), "COSS_E2E is not set (see the file comment)");
        JsonNode server = new ObjectMapper().readTree(raw);
        coss = Coss.builder()
                .apiKey(server.get("sandbox_key").asText())
                .url(server.get("base_url").asText())
                .build();
    }

    @Test
    void sendGetAndList() {
        Email email = coss.email()
                .send(SendEmailRequest.builder()
                        .from("Acme <hello@acme.test>")
                        .to(SendEmailRequestTo.of(Collections.singletonList("ada@example.com")))
                        .subject("Hello from Java")
                        .text("It works.")
                        .build());
        assertTrue(email.getId().startsWith("email_"));
        assertEquals(email.getId(), coss.email().get(email.getId()).getId());
        assertEquals(1, coss.email().list(ListEmailRequest.builder().limit(1).build()).getData().size());
    }

    @Test
    void errors() {
        UnprocessableEntityError invalid = assertThrows(UnprocessableEntityError.class, () -> coss.email()
                .send(SendEmailRequest.builder()
                        .from("not an address")
                        .to(SendEmailRequestTo.of(Collections.singletonList("ada@example.com")))
                        .text("Hi")
                        .build()));
        assertFalse(invalid.body().getError().getIssues().orElseThrow(IllegalStateException::new).isEmpty());
        NotFoundError notFound =
                assertThrows(NotFoundError.class, () -> coss.email().get("email_01k00000000000000000000000"));
        assertTrue(notFound.body().getError().getRequestId().startsWith("req_"));
    }

    @Test
    void csvExport() {
        assertTrue(coss.email().suppressions().export().startsWith("address,scope,reason,"));
    }

    @Test
    void readsParse() {
        coss.environment().get();
        coss.reputation().get();
        coss.billing().get();
        coss.logs().list();
        coss.auditEvents().list();
        coss.domains().list();
        coss.webhookEndpoints().list();
        coss.email().suppressions().list();
        coss.email().templates().list();
        coss.email().contacts().list();
        coss.email().tracking().get();
        coss.hooks().applications().list();
        coss.risk().settings().get();
        coss.risk().rules().list();
    }
}
