# Reference
## Environment
<details><summary><code>client.environment.get() -> Environment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Which environment, project and organization the API key belongs to, and the key itself. Any valid key can read its own environment (no permission needed): use it to check a key and show where it sends.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.environment().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## ApiKey
<details><summary><code>client.apiKey.revoke() -> DeletedApiKey</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Revokes the API key making this request, at once: every later request with it fails with `invalid_api_key`. `coss logout --revoke` uses it. Other keys are revoked in the dashboard.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.apiKey().revoke();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email
<details><summary><code>client.email.list() -> EmailSummaryList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Emails sent from the API key's environment, newest first, without their content (retrieve an email for `html`, `text`, `headers` and `attachments`). Filter by recipient (`to`), by the email's or a recipient's status, by category, batch or creation time. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().list(
    ListEmailRequest
        .builder()
        .to("user@example.com")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**to:** `Optional<String>` — Only emails with this recipient (in `to`, `cc` or `bcc`; the bare address, any case).
    
</dd>
</dl>

<dl>
<dd>

**recipientStatus:** `Optional<String>` — Only emails with a recipient in one of these statuses, comma-separated: `bounced,complained`. With `to`, that recipient's status.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<String>` — Only emails in these statuses, comma-separated: `failed`.
    
</dd>
</dl>

<dl>
<dd>

**q:** `Optional<String>` — Free text, matched against the subject and the `to` addresses.
    
</dd>
</dl>

<dl>
<dd>

**category:** `Optional<String>` — Only emails of this category.
    
</dd>
</dl>

<dl>
<dd>

**batchId:** `Optional<String>` — Only the emails of this batch.
    
</dd>
</dl>

<dl>
<dd>

**createdAfter:** `Optional<OffsetDateTime>` — Only emails created at or after this time.
    
</dd>
</dl>

<dl>
<dd>

**createdBefore:** `Optional<OffsetDateTime>` — Only emails created before this time.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 20.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last email of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.send(request) -> Email</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues an email from the API key's environment and returns it with `status: "queued"`; it is handed to the delivery provider moments later. Follow it with `GET /v1/emails/{id}` or the `email.sent` / `email.failed` webhooks. Live (`coss_live_…`) keys must send from a verified domain of the organization. Sandbox (`coss_test_…`) keys accept any `from` and never deliver anything; the response has `sandbox: true`. Recipients on the environment's suppression list (for every email, or for the email's `category`) are skipped and get the status `suppressed`. With a future `scheduled_at` the email is stored with the status `scheduled` and sent at that time; the domain and the suppression list are checked again then. Attachments are base64-encoded; only metadata is kept after sending. Recipients count against the organization's send quota (per second and per day; sandbox environments have their own daily quota). With open or click tracking on (the environment's settings, or `tracking`), the HTML body is delivered with a tracking pixel and/or links rewritten to coss.com redirects; the stored `html` stays as sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().send(
    SendEmailBody
        .builder()
        .body(
            SendEmailRequest
                .builder()
                .from("Acme <onboarding@acme.com>")
                .to(
                    SendEmailRequestTo.of("user@example.com")
                )
                .subject("Welcome to Acme")
                .html("<p>Thanks for signing up!</p>")
                .tags(
                    Optional.of(
                        Arrays.asList(
                            SendEmailRequestTagsItem
                                .builder()
                                .name("template")
                                .value("welcome")
                                .build()
                        )
                    )
                )
                .category("onboarding")
                .build()
        )
        .idempotencyKey("welcome-user-123")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idempotencyKey:** `Optional<String>` — Makes retries safe: a repeated request with the same key and body returns the original email (with its current status) instead of sending again, for 24 hours. 1-256 characters.
    
</dd>
</dl>

<dl>
<dd>

**request:** `SendEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.sendBatch(request) -> EmailBatch</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues up to 100 emails in one request. Each email is handled exactly as by `POST /v1/emails` (sender checks, suppressions, scheduling, attachments, tracking), but the batch is all or nothing: if any email is invalid, or any `from` is not a verified domain (live keys), nothing is stored and the error names the email (e.g. `emails.3.to`). One `Idempotency-Key` covers the whole batch. The emails' recipients are charged against the send quota together, so a batch with more recipients than the quota allows at once is refused (`quota_exceeded` without `Retry-After`): split it. The request body shares the 40 MB limit of a single send.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().sendBatch(
    SendEmailBatchRequest
        .builder()
        .emails(
            Arrays.asList(
                SendEmailRequest
                    .builder()
                    .from("Acme <notifications@acme.com>")
                    .to(
                        SendEmailRequestTo.of("ada@example.com")
                    )
                    .subject("Your weekly summary")
                    .html("<p>Hi Ada, here is your week.</p>")
                    .category("digest")
                    .build(),
                SendEmailRequest
                    .builder()
                    .from("Acme <notifications@acme.com>")
                    .to(
                        SendEmailRequestTo.of("grace@example.com")
                    )
                    .subject("Your weekly summary")
                    .html("<p>Hi Grace, here is your week.</p>")
                    .category("digest")
                    .build()
            )
        )
        .idempotencyKey("welcome-user-123")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idempotencyKey:** `Optional<String>` — Makes retries safe: a repeated request with the same key and body returns the original email (with its current status) instead of sending again, for 24 hours. 1-256 characters.
    
</dd>
</dl>

<dl>
<dd>

**emails:** `List<SendEmailRequest>` — Up to 100 emails, each accepted by `POST /v1/emails`. The batch is accepted or rejected as a whole.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.getBatch(id) -> EmailBatch</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A batch sent with `POST /v1/emails/batch`, with its emails' current statuses in the order of the request. Emails past the data retention period are left out. Only batches sent from the API key's own environment can be retrieved.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().getBatch(
    "batch_01k8d0n6x5f3w2e1r9t7y4u6i8",
    GetBatchEmailRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The batch's id (`batch_id` of its emails).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.get(id) -> Email</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Only emails sent from the API key's own environment can be retrieved.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().get(
    "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetEmailRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.cancel(id) -> Email</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Cancels an email sent with a future `scheduled_at` before it is sent. Canceling an already canceled email returns it unchanged. To send it at another time, reschedule it instead.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().cancel(
    "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    CancelEmailRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.reschedule(id, request) -> Email</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Moves an email sent with a future `scheduled_at` to a new time, at most 30 days from now, and records an `email.rescheduled` event. A time that is not in the future sends it within seconds. Rescheduling to the time it already has returns it unchanged. The domain and the suppression list are still checked when it is sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().reschedule(
    "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RescheduleEmailRequest
        .builder()
        .scheduledAt(OffsetDateTime.parse("2026-10-12T09:00:00Z"))
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The email's id.
    
</dd>
</dl>

<dl>
<dd>

**scheduledAt:** `OffsetDateTime` — The new time to send the email at (ISO 8601 with an offset, at most 30 days ahead). A time that is not in the future sends it right away.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.listEvents(id) -> EmailEventList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every delivery event of the email, oldest first: `email.scheduled`, `email.rescheduled`, `email.canceled`, `email.sent` and `email.failed` for the whole email, and `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained` and `email.suppressed` (skipped because of the suppression list) per recipient, plus `email.opened` and `email.clicked` when tracking is on (attributed to a recipient only when the email had a single one) and `email.unsubscribed` after a one-click unsubscribe.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().listEvents(
    "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListEventsEmailRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.listLinks(id) -> EmailLinkList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The links coss.com rewrote for click tracking, in the order they appear in the HTML, with their click counts. Empty unless the email was sent with click tracking.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().listLinks(
    "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListLinksEmailRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains
<details><summary><code>client.domains.list() -> DomainList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every domain of the organization, ordered by name. Domains belong to the organization, not to one environment, so every API key of the organization sees the same domains.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().list();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.create(request) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Claims the domain for the organization and returns the DNS records to publish. Domains belong to the organization, not to one environment, so every API key of the organization sees the same domains. The records are checked repeatedly in the background and verification gives up after 72 hours; until the domain is `verified`, live keys cannot send from it.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().create(
    CreateDomainRequest
        .builder()
        .name("acme.com")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — The domain to send from, without a scheme or path. Subdomains are allowed; internationalized domains must be punycode-encoded.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.get(id) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The domain with the result of the last DNS check, so you can show which records are still missing or mismatched.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().get(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetDomainsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.delete(id) -> DeletedDomain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the domain and its provider identity. Emails already sent are unaffected, but live keys can no longer send from it and the name becomes available again.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().delete(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteDomainsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.verify(id) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Asks the delivery provider and DNS about the domain immediately instead of waiting for the next background check, and returns the updated domain. A `failed` domain starts verification over with fresh DKIM records, which have to be published again. Its tracking domain, if any, is checked too (and set up again if it `failed`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().verify(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    VerifyDomainsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Webhook endpoints
<details><summary><code>client.webhookEndpoints.list() -> WebhookEndpointList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every endpoint of the API key's environment, oldest first. Webhook endpoints belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox endpoints, and a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().list();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.create(request) -> WebhookEndpointWithSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Registers a URL that receives signed event notifications. Webhook endpoints belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox endpoints, and a `coss_live_…` key only production ones. The response carries the signing secret, which is returned only here and when it is rolled: store it, and verify every delivery with it (`verifyWebhook` in the SDK).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().create(
    CreateWebhookEndpointRequest
        .builder()
        .url("https://example.com/webhooks/coss")
        .description("Production receiver")
        .eventTypes(
            Optional.of(
                Arrays.asList(CreateWebhookEndpointRequestEventTypesItem.EMAIL_SENT, CreateWebhookEndpointRequestEventTypesItem.EMAIL_DELIVERED)
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**url:** `String` — An `https://` URL coss.com posts events to.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` — A note for your own reference. `null` clears it.
    
</dd>
</dl>

<dl>
<dd>

**eventTypes:** `Optional<List<CreateWebhookEndpointRequestEventTypesItem>>` — Event types delivered to this endpoint. An empty array means every event type, including ones added later. Defaults to every event type.
    
</dd>
</dl>

<dl>
<dd>

**apiVersion:** `Optional<CreateWebhookEndpointRequestApiVersion>` — The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as `api_version`. Defaults to the version of the request that creates the endpoint.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.get(id) -> WebhookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The endpoint without its signing secret, which is only returned when created or rolled.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().get(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetWebhookEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.delete(id) -> DeletedWebhookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the endpoint and its delivery log. Deliveries already queued for it are dropped. To stop deliveries temporarily, set `enabled` to `false` instead.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().delete(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteWebhookEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.update(id, request) -> WebhookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the URL, description, subscribed event types, API version or `enabled` flag. Omitted fields keep their current value, and the signing secret stays the same (see Roll a signing secret), so receivers keep verifying deliveries. Disabling an endpoint stops deliveries without losing its configuration.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().update(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateWebhookEndpointRequest
        .builder()
        .enabled(false)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**url:** `Optional<String>` — An `https://` URL coss.com posts events to.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` — A note for your own reference. `null` clears it.
    
</dd>
</dl>

<dl>
<dd>

**eventTypes:** `Optional<List<UpdateWebhookEndpointRequestEventTypesItem>>` — Event types delivered to this endpoint. An empty array means every event type, including ones added later.
    
</dd>
</dl>

<dl>
<dd>

**apiVersion:** `Optional<UpdateWebhookEndpointRequestApiVersion>` — The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as `api_version`.
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Optional<Boolean>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.rollSecret(id, request) -> WebhookEndpointWithSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces the endpoint's signing secret with a new one, returned in the response (the only time it is). Until `previous_secret_expires_at`, every delivery is signed with both secrets (`webhook-signature` lists two signatures), so receivers verifying with either one accept it: deploy the new secret, then let the old one expire. Rolling again in that time stops the older secret at once. Not idempotent: after a lost response, roll again.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().rollSecret(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RollWebhookEndpointSecretRequest
        .builder()
        .previousSecretExpiresIn(3600)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**previousSecretExpiresIn:** `Optional<Integer>` — Seconds the current secret keeps signing deliveries next to the new one, so receivers can switch without rejecting anything. Default 86400 (a day), at most 604800 (a week). `0` stops it immediately, e.g. after a leak.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.recover(id, request) -> WebhookEndpointRecovery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues the endpoint's deliveries that `failed` since `since` for one more attempt each, oldest first, spread over the next minute, e.g. after fixing a receiver that was down. At most 1000 per call: while `has_more` is `true`, call again with the same `since`. The endpoint must be enabled.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().recover(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RecoverWebhookEndpointRequest
        .builder()
        .since(OffsetDateTime.parse("2026-01-15T09:00:00Z"))
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**since:** `OffsetDateTime` — Requeue the endpoint's deliveries that failed and were created at or after this time (ISO 8601). Deliveries are kept for 30 days.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## WebhookListeners
<details><summary><code>client.webhookListeners.create(request) -> WebhookListener</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Listeners are how `coss listen` forwards events to a local server: coss.com can't reach `localhost`, so the CLI pulls them. They belong to the API key's environment, receive events created after they open, and don't count toward the plan's webhook endpoints. A listener closes when it is deleted or after 10 minutes without a poll; an environment has at most 5 open at once. Events reach it unsigned: the CLI signs what it forwards with its own secret.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookListeners().create(
    CreateWebhookListenerRequest
        .builder()
        .eventTypes(
            Optional.of(
                Arrays.asList(CreateWebhookListenerRequestEventTypesItem.EMAIL_SENT, CreateWebhookListenerRequestEventTypesItem.EMAIL_DELIVERED)
            )
        )
        .description("localhost:3000/webhooks")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**eventTypes:** `Optional<List<CreateWebhookListenerRequestEventTypesItem>>` — Event types to receive. Defaults to every event type.
    
</dd>
</dl>

<dl>
<dd>

**apiVersion:** `Optional<CreateWebhookListenerRequestApiVersion>` — The API version events are rendered in. Defaults to the version of the request that creates the listener.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` — Where the events go, for your own reference (shown in the log).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookListeners.poll(id, request) -> WebhookListenerPoll</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Acknowledges deliveries handed out earlier, keeps the listener open for another 10 minutes, and waits up to `wait_ms` (at most 25 s) for events. Deliveries come oldest first; one not acknowledged within two minutes is handed out again (with the same `event_id`). The answer may come early, with no deliveries, when the API restarts: poll again. Polls are not request-logged; each acknowledgement is logged as a `webhook.forward` line.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookListeners().poll(
    "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
    PollWebhookListenerRequest
        .builder()
        .acks(
            Optional.of(
                Arrays.asList(
                    WebhookListenerAck
                        .builder()
                        .deliveryId("whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv")
                        .ackToken("mfz3k2a8")
                        .durationMs(12)
                        .statusCode(200)
                        .error(
                            Nullable.ofNull()
                        )
                        .build()
                )
            )
        )
        .waitMs(20000)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook listener's id.
    
</dd>
</dl>

<dl>
<dd>

**acks:** `Optional<List<WebhookListenerAck>>` — What happened to deliveries handed out earlier. A delivery is finished once acknowledged: a 2xx status (or none, with no error) succeeds; anything else fails. Neither is retried.
    
</dd>
</dl>

<dl>
<dd>

**waitMs:** `Optional<Integer>` — How long to wait for deliveries when none is pending, in milliseconds. Default 20000, at most 25000.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — The most deliveries to hand out. Default 10, at most 50.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookListeners.delete(id) -> DeletedWebhookListener</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Closes the listener: it receives nothing more, and deliveries it was still holding are dropped. `coss listen` closes its listener when it exits.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookListeners().delete(
    "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteWebhookListenersRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook listener's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Reputation
<details><summary><code>client.reputation.get() -> Reputation</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The organization's standing with the coss.com reputation guard and the latest rates it measured over live environments. When a rate reaches its suspension threshold, live sending is suspended automatically (`account_suspended`) until coss.com support reinstates the organization; sandbox keys keep working. Subscribe to the `account.*` webhook events to be notified of changes.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.reputation().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Logs
<details><summary><code>client.logs.list() -> LogList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The API key's environment log, newest first: every API request made with one of its keys (`source: api`), every email event (`email`) and every webhook delivery attempt (`webhook`). Filter by time range (an hour by default, at most 31 days), source, level, type, status, method, route, key, request, resource or free text. Pass the last `id` as `after` to get the next page while `has_more` is true. Reading logs is not itself logged.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logs().list(
    ListLogsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**from:** `Optional<OffsetDateTime>` — Start of the range (inclusive). Defaults to an hour before `to`.
    
</dd>
</dl>

<dl>
<dd>

**to:** `Optional<OffsetDateTime>` — End of the range (exclusive). Defaults to now. At most 31 days.
    
</dd>
</dl>

<dl>
<dd>

**source:** `Optional<String>` — Only these sources, comma-separated: `api,email,webhook`.
    
</dd>
</dl>

<dl>
<dd>

**level:** `Optional<String>` — Only these levels, comma-separated: `warning,error`.
    
</dd>
</dl>

<dl>
<dd>

**type:** `Optional<String>` — Only these types, e.g. `email.bounced,email.complained`.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<String>` — Only these status codes or classes, e.g. `4xx,503`.
    
</dd>
</dl>

<dl>
<dd>

**method:** `Optional<String>` — Only these HTTP methods, e.g. `POST`.
    
</dd>
</dl>

<dl>
<dd>

**route:** `Optional<String>` — Only these routes, e.g. `/v1/emails/:id`.
    
</dd>
</dl>

<dl>
<dd>

**apiKeyId:** `Optional<String>` — Only requests made with these API keys.
    
</dd>
</dl>

<dl>
<dd>

**requestId:** `Optional<String>` — Only this request's lines.
    
</dd>
</dl>

<dl>
<dd>

**resourceId:** `Optional<String>` — Only lines about this resource, e.g. an `email_…` id.
    
</dd>
</dl>

<dl>
<dd>

**q:** `Optional<String>` — Free text, matched against the message, path, ids and recipient.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last line of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.logs.get(id) -> Log</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logs().get(
    "log_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetLogsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The log line's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## AuditEvents
<details><summary><code>client.auditEvents.list() -> AuditEventList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The organization's audit log, newest first: changes made by members in the dashboard, by API keys (from any environment) and by coss.com support. The audit log is organization-wide, so every key of the organization reads the same events. Filter by action (an entry ending in `.` matches a whole resource, e.g. `domain.`), actor, target, environment or time. Pass the last `id` as `after` to get the next page while `has_more` is true. Reading the audit log is not itself logged.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.auditEvents().list(
    ListAuditEventsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**action:** `Optional<String>` — Only these actions, comma-separated. An entry ending in `.` matches every action of that resource: `domain.,api_key.created`.
    
</dd>
</dl>

<dl>
<dd>

**actorType:** `Optional<String>` — Only these actor types, e.g. `user,api_key`.
    
</dd>
</dl>

<dl>
<dd>

**actorId:** `Optional<String>` — Only changes made by this user or API key.
    
</dd>
</dl>

<dl>
<dd>

**targetId:** `Optional<String>` — Only changes to this resource, e.g. a `dom_…` id.
    
</dd>
</dl>

<dl>
<dd>

**environmentId:** `Optional<String>` — Only changes in this environment.
    
</dd>
</dl>

<dl>
<dd>

**from:** `Optional<OffsetDateTime>` — Only events at or after this time.
    
</dd>
</dl>

<dl>
<dd>

**to:** `Optional<OffsetDateTime>` — Only events before this time.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last event of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.auditEvents.get(id) -> AuditEvent</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.auditEvents().get(
    "oaudit_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetAuditEventsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audit event's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Billing
<details><summary><code>client.billing.get() -> Billing</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The organization's plan (and contract), the current billing month's usage and what it would add to the next invoice so far, its standing (`past_due`, billing holds), payment method, and what the plan includes. Organization-wide: every environment's key sees the same. Plan changes are made in the dashboard; subscribe to the `billing.*` webhook events to follow them.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.billing().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.billing.usage() -> UsageList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Billable usage over a range (the current billing month by default), per meter, dimension and bucket (`hour`, `day` or `month`, UTC), oldest first; with `group_by=environment`, per environment too. Only live environments are billed, so only they appear. Usage counts when it becomes billable (an email when the provider accepts it) and is kept for 400 days.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.billing().usage(
    UsageBillingRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**from:** `Optional<OffsetDateTime>` — Start (inclusive). Defaults to the start of the current billing month.
    
</dd>
</dl>

<dl>
<dd>

**to:** `Optional<OffsetDateTime>` — End (exclusive). Defaults to now. At most 400 days after `from` (7 by hour).
    
</dd>
</dl>

<dl>
<dd>

**granularity:** `Optional<UsageBillingRequestGranularity>` — Bucket size (UTC). Defaults to `day`.
    
</dd>
</dl>

<dl>
<dd>

**groupBy:** `Optional<UsageBillingRequestGroupBy>` — Split each bucket per environment.
    
</dd>
</dl>

<dl>
<dd>

**meter:** `Optional<UsageBillingRequestMeter>` — Only this meter.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Log drains
<details><summary><code>client.logDrains.list() -> LogDrainList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every drain of the API key's environment, oldest first. Log drains belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox drains, and a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().list();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.logDrains.create(request) -> LogDrainWithSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Streams the environment's logs to a URL: every line `GET /v1/logs` returns (API requests, email events, webhook attempts) and the environment's audit events, posted as signed NDJSON batches of up to 500 lines or 1 MB, usually within seconds. Log drains belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox drains, and a `coss_live_…` key only production ones. The response carries the signing secret, which is returned only here: store it, and verify every batch with it (`verifyLogDrainBatch` in the SDK).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().create(
    CreateLogDrainRequest
        .builder()
        .url("https://logs.example.com/coss")
        .description("Production logs")
        .sources(
            Optional.of(
                Arrays.asList(LogDrainSource.API, LogDrainSource.EMAIL)
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**url:** `String` — An `https://` URL coss.com posts batches of log lines to.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` — A note for your own reference. `null` clears it.
    
</dd>
</dl>

<dl>
<dd>

**sources:** `Optional<List<LogDrainSource>>` — What the drain forwards: `api` (requests made with the environment's API keys), `email` (email events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from the organization's audit log). An empty array means every source, including ones added later. Defaults to every source.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.logDrains.get(id) -> LogDrain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The drain without its signing secret, which is only returned when created.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().get(
    "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetLogDrainsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The log drain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.logDrains.delete(id) -> DeletedLogDrain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the drain and its batch log. Lines still waiting for it are dropped. To stop it temporarily, set `enabled` to `false` instead.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().delete(
    "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteLogDrainsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The log drain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.logDrains.update(id, request) -> LogDrain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the URL, description, sources or `enabled` flag. Omitted fields keep their current value, and the signing secret stays the same. Disabling a drain drops the lines still waiting for it, and nothing is kept for it while it is disabled; enabling it again (also after coss.com disabled it for failing) sends lines logged from then on.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().update(
    "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateLogDrainRequest
        .builder()
        .enabled(false)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The log drain's id.
    
</dd>
</dl>

<dl>
<dd>

**url:** `Optional<String>` — An `https://` URL coss.com posts batches of log lines to.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` — A note for your own reference. `null` clears it.
    
</dd>
</dl>

<dl>
<dd>

**sources:** `Optional<List<LogDrainSource>>` — What the drain forwards: `api` (requests made with the environment's API keys), `email` (email events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from the organization's audit log). An empty array means every source, including ones added later.
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Optional<Boolean>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk
<details><summary><code>client.risk.assess(request) -> RiskAssessment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Assesses a sign-up, login or other event in the API key's environment and returns a decision (`allow`, `review` or `block`) with a score and the reasons behind it. coss.com combines email and IP signals with what it has seen in this environment (velocity, accounts sharing a mailbox, identifiers you reported) and your allow and block lists. Signals that are unavailable at the moment are skipped and listed in `degraded`. Call it from your server, never from the browser, and treat errors as `allow` (fail open) so an outage never locks your users out. `review` decisions also fire a `risk.assessment.review` webhook. Sandbox (`coss_test_…`) keys accept documented test addresses (`192.0.2.x`, `@disposable.test`, `@undeliverable.test`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().assess(
    CreateRiskAssessmentRequest
        .builder()
        .event(RiskEvent.SIGNUP)
        .idempotencyKey("welcome-user-123")
        .user(
            CreateRiskAssessmentRequestUser
                .builder()
                .email("ada@gmail.con")
                .build()
        )
        .ip("203.0.113.7")
        .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idempotencyKey:** `Optional<String>` — Makes retries safe: a repeated request with the same key and body returns the original assessment instead of assessing (and counting) the event again, for 24 hours. 1-256 characters.
    
</dd>
</dl>

<dl>
<dd>

**event:** `RiskEvent` 
    
</dd>
</dl>

<dl>
<dd>

**eventName:** `Optional<String>` — Required for `custom` events (e.g. `invite_sent`), not allowed otherwise.
    
</dd>
</dl>

<dl>
<dd>

**user:** `Optional<CreateRiskAssessmentRequestUser>` 
    
</dd>
</dl>

<dl>
<dd>

**ip:** `Optional<String>` — The client's IP address (not your server's or proxy's).
    
</dd>
</dl>

<dl>
<dd>

**userAgent:** `Optional<String>` — The client's user agent.
    
</dd>
</dl>

<dl>
<dd>

**captcha:** `Optional<CreateRiskAssessmentRequestCaptcha>` 
    
</dd>
</dl>

<dl>
<dd>

**checkout:** `Optional<RiskCheckoutRequest>` 
    
</dd>
</dl>

<dl>
<dd>

**device:** `Optional<CreateRiskAssessmentRequestDevice>` — The browser the event came from: recognizes it across accounts (`duplicate.device`, device velocity, fraud memory) and spots automation.
    
</dd>
</dl>

<dl>
<dd>

**content:** `Optional<CreateRiskAssessmentRequestContent>` — Content to classify with the event. Its scores go in `signals.content` and rules can test them; `content.*` reasons fire only at thresholds you set.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.feedback(id, request) -> RiskAssessment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Tells coss.com what the assessed user turned out to be. `fraud` and `abuse` make later assessments with the same mailbox, user, IP address or subnet flag it (`history.fraud_*`); `legitimate` takes back what this assessment reported. Resolves an open review. Sending the latest outcome again changes nothing.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().feedback(
    "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz",
    CreateRiskFeedbackRequest
        .builder()
        .outcome(RiskOutcome.FRAUD)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The assessment's id.
    
</dd>
</dl>

<dl>
<dd>

**outcome:** `RiskOutcome` 
    
</dd>
</dl>

<dl>
<dd>

**note:** `Optional<String>` — For your team; never shared.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.calibration() -> RiskCalibration</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

How often each reason and rule was right over the last 90 days, by the outcomes you reported with feedback, and the reason weights that supports. Nothing changes until you apply them with `reason_weights` in the settings.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().calibration();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.checkEmail(request) -> RiskEmailCheck</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Email intelligence on its own: syntax, disposable domains, whether the domain can receive mail (DNS), role accounts, free providers, the canonical mailbox, typo suggestions and the domain's age (RDAP). Stateless: nothing is stored or counted, so it never flags an address for having been seen before (assessments do). Failed lookups are listed in `degraded`. Sandbox keys see the documented test domains (`@disposable.test`, `@undeliverable.test`, `@new.test`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().checkEmail(
    RiskEmailCheckRequest
        .builder()
        .email("ada@gnail.com")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**email:** `String` — The address to check, as given.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.checkIp(request) -> RiskIpCheck</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

IP intelligence on its own: Tor exit nodes, cloud and hosting networks, networks mostly used by VPN and proxy services, the network (ASN) and its country. Stateless. Missing IP data is reported in `degraded`. Sandbox keys see the documentation addresses (`192.0.2.1` Tor, `.2` cloud, `.3` VPN, the rest residential).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().checkIp(
    RiskIpCheckRequest
        .builder()
        .ip("185.220.101.1")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**ip:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.classify(request) -> RiskContentClassification</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Scores text people post on your platform (a profile bio, a comment, a listing) for spam, phishing, malware and fraud with an AI model, with zero data retention. Returns scores only: you decide what they mean. Neither the text nor the scores are stored, and request logs keep no body for this endpoint. Takes up to 3 seconds; a failure is a 503 you can retry or treat as unknown. Limited per organization as well as per key. Sandbox keys use markers instead of a model: `[coss-test:phishing]` scores 0.99, `[coss-test:spam:0.4]` exactly 0.4, everything else 0.01.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().classify(
    RiskContentClassifyRequest
        .builder()
        .text("Earn $5,000 a week from home! DM me on Telegram: t.me/fast-cash")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**text:** `String` — The text to classify (a profile bio, a comment, a listing). The model reads the first 8,000 characters.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.limit(request) -> RiskLimit</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Takes `cost` tokens (default 1) from `key`'s share of one of your buckets and says whether to let the request through: a 200 either way, with `allowed`. Denied requests take nothing. Each key has its own bucket of `burst` tokens refilling at `limit` per `period_seconds` (GCRA, the algorithm coss.com limits its own API with). coss.com keeps only a keyed hash of `key`. While coss.com can't count, the bucket's `on_failure` answers and `degraded` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().limit(
    CheckRiskLimitRequest
        .builder()
        .bucket("password_reset")
        .key("ada@example.com")
        .idempotencyKey("welcome-user-123")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idempotencyKey:** `Optional<String>` — Makes retries safe: a repeated allowed check with the same key is answered again without taking more tokens, for an hour. 1-256 characters.
    
</dd>
</dl>

<dl>
<dd>

**bucket:** `String` — The bucket's name.
    
</dd>
</dl>

<dl>
<dd>

**key:** `String` — Who or what is limited: a user id, an email address, an IP address… coss.com keeps only a keyed hash of it.
    
</dd>
</dl>

<dl>
<dd>

**cost:** `Optional<Integer>` — Tokens this request takes. Default 1.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Billing Invoices
<details><summary><code>client.billing.invoices.list() -> InvoiceList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The organization's invoices, newest first, without their lines. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.billing().invoices().list(
    ListInvoicesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**status:** `Optional<ListInvoicesRequestStatus>` — Only invoices in this status.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Continue after this id (the last of the previous page).
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — At most this many (default 20).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.billing.invoices.get(id) -> Invoice</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One invoice with its lines.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.billing().invoices().get(
    "inv_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetInvoicesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The invoice's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Billing Credits
<details><summary><code>client.billing.credits.list() -> CreditList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The organization's credits, newest first: each month's plan credit, prepaid commitments and credits from coss.com support (in dollars, or free units of a product), with what's left. Only usable ones by default (`status=all` for every one). Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.billing().credits().list(
    ListCreditsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**status:** `Optional<ListCreditsRequestStatus>` — `active` (default): usable now or later, with something left; `all`: every credit, newest first.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Continue after this id (the last of the previous page).
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — At most this many (default 20).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Tracking
<details><summary><code>client.domains.tracking.create(id, request) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sets up a subdomain of the domain (e.g. `links.acme.com`) to serve open and click tracking. Publish the CNAME record in `tracking.record`; coss.com then issues its certificate and checks it in the background, giving up after 72 hours. Open pixels and click redirects of emails sent from the domain (or its subdomains without a domain of their own) use the tracking domain while it is `active`, and the default tracking host otherwise. A domain has at most one tracking domain: remove it to use another hostname.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().tracking().create(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    CreateTrackingDomainRequest
        .builder()
        .hostname("links.acme.com")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>

<dl>
<dd>

**hostname:** `String` — A subdomain of the domain to serve tracking links from, without a scheme or path. Point it at coss.com with the CNAME record the response lists.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.tracking.delete(id) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the domain's tracking domain. Later emails use the default tracking host, but links and open pixels in emails already sent through the tracking domain stop working.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().tracking().delete(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteTrackingRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Receiving
<details><summary><code>client.domains.receiving.create(id, request) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Starts receiving email at the domain itself or a subdomain (e.g. `inbound.acme.com`): email sent to any address at that hostname becomes a received email of the API key's environment (an `email.received` webhook, `GET /v1/received_emails`). Publish the MX record in `receiving.record`; coss.com checks it in the background. Using the domain itself moves all of its mail to coss.com. A domain has at most one receiving hostname: remove it to use another one.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().receiving().create(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    CreateReceivingDomainRequest
        .builder()
        .hostname("inbound.acme.com")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>

<dl>
<dd>

**hostname:** `String` — The domain itself or a subdomain of it, without a scheme or path. Point its MX at coss.com with the record the response lists. Using the domain itself moves all of its mail to coss.com, so a subdomain is usually the better choice.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.receiving.delete(id) -> Domain</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Stops receiving at the domain's receiving hostname: later mail to it is dropped (remove the MX record too). Emails already received stay until their retention ends.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().receiving().delete(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteReceivingRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Dmarc
<details><summary><code>client.domains.dmarc.get(id) -> DomainDmarc</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The domain's published DMARC record, where it is on the path from `p=none` to `p=reject`, the record to publish next and whether the last 14 days of aggregate reports say that is safe (`ready`, with the `checks` behind it), and a summary of those reports. Mailbox providers send DMARC aggregate reports to the domain's `report_address` once its `_dmarc` record names it (`rua=mailto:…`), usually once a day each.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().dmarc().get(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetDmarcRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Dmarc Reports
<details><summary><code>client.domains.dmarc.reports.list(id) -> DmarcReportList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The aggregate reports received about the domain, newest first, without their rows (retrieve one for those). Pass the last `id` as `after` to get the next page while `has_more` is true. Mailbox providers send DMARC aggregate reports to the domain's `report_address` once its `_dmarc` record names it (`rua=mailto:…`), usually once a day each.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().dmarc().reports().list(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListReportsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 20.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last report of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.domains.dmarc.reports.get(id, reportId) -> DmarcReport</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One aggregate report with its rows: each source IP, how many messages it sent, whether they passed DMARC (aligned DKIM or SPF) and what the receiver did with them.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.domains().dmarc().reports().get(
    "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
    "dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetReportsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The domain's id.
    
</dd>
</dl>

<dl>
<dd>

**reportId:** `String` — The report's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Templates
<details><summary><code>client.email.templates.list() -> EmailTemplateList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The environment's templates, newest first. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().list(
    ListTemplatesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last template of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.create(request) -> EmailTemplate</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a template with a draft holding its variables and a subject, HTML and text per locale. Sends use it once its draft is published. Not idempotent: retrying after a lost response can create a second template (unless it has an `alias`). Templates belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones. Give a template the same `alias` in every environment to send it by that name.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().create(
    CreateEmailTemplateRequest
        .builder()
        .name("Welcome")
        .alias("welcome")
        .defaultLocale("en")
        .variables(
            Optional.of(
                Arrays.asList(
                    TemplateVariableInput
                        .builder()
                        .name("first_name")
                        .type(TemplateVariableInputType.STRING)
                        .required(true)
                        .build()
                )
            )
        )
        .sampleVariables(
            new HashMap<String, Object>() {{
                put("first_name", "Ada");
            }}
        )
        .contents(
            Optional.of(
                Arrays.asList(
                    TemplateContentInput
                        .builder()
                        .locale("en")
                        .subject("Welcome, {{first_name}}")
                        .html("<p>Hi {{first_name}}, thanks for signing up!</p>")
                        .build(),
                    TemplateContentInput
                        .builder()
                        .locale("de")
                        .subject("Willkommen, {{first_name}}")
                        .html("<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>")
                        .build()
                )
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — Shown in the dashboard.
    
</dd>
</dl>

<dl>
<dd>

**alias:** `Optional<String>` — A name to send the template by instead of its id, e.g. `welcome`: the same alias can be used in every environment.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**defaultLocale:** `Optional<String>` — The locale sends fall back to when they ask for none, or for one without content. Defaults to the first entry of `contents` (or "en").
    
</dd>
</dl>

<dl>
<dd>

**variables:** `Optional<List<TemplateVariableInput>>` — The variables the template uses, with their types.
    
</dd>
</dl>

<dl>
<dd>

**sampleVariables:** `Optional<Map<String, Object>>` — Example values for previews and test sends in the dashboard.
    
</dd>
</dl>

<dl>
<dd>

**contents:** `Optional<List<TemplateContentInput>>` — The subject, HTML and text per locale.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.get(id) -> EmailTemplate</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A template by id or alias. Its content is in its draft and versions.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().get(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetTemplatesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.delete(id) -> DeletedEmailTemplate</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the template with its draft and every version. Emails already sent or scheduled from it keep their content; new sends naming it fail with `template_not_found`.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().delete(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteTemplatesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.update(id, request) -> EmailTemplate</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the template's name, alias or description. Changing the alias changes what sends must use. Content changes go to the draft (`PUT /v1/email_templates/{id}/draft`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().update(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateEmailTemplateRequest
        .builder()
        .name("Welcome (new users)")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>

<dl>
<dd>

**name:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**alias:** `Optional<String>` — `null` removes the alias.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.getDraft(id) -> EmailTemplateVersion</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The draft (`version: null`): what the next publish makes sends use. `problems` lists syntax errors and undeclared variables, which keep it from being published.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().getDraft(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetDraftTemplatesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.updateDraft(id, request) -> EmailTemplateVersion</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces the draft's variables and content. Sends keep using the published version until the draft is published. Pass the `revision` you read to refuse overwriting someone else's changes. A draft with problems is saved (and reported in `problems`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().updateDraft(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateEmailTemplateDraftRequest
        .builder()
        .revision(3L)
        .defaultLocale("en")
        .variables(
            Optional.of(
                Arrays.asList(
                    TemplateVariableInput
                        .builder()
                        .name("first_name")
                        .type(TemplateVariableInputType.STRING)
                        .required(true)
                        .build()
                )
            )
        )
        .sampleVariables(
            new HashMap<String, Object>() {{
                put("first_name", "Ada");
            }}
        )
        .contents(
            Optional.of(
                Arrays.asList(
                    TemplateContentInput
                        .builder()
                        .locale("en")
                        .subject("Welcome, {{first_name}}")
                        .html("<p>Hi {{first_name}}, thanks for signing up!</p>")
                        .build(),
                    TemplateContentInput
                        .builder()
                        .locale("de")
                        .subject("Willkommen, {{first_name}}")
                        .html("<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>")
                        .build()
                )
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>

<dl>
<dd>

**revision:** `Optional<Long>` — The draft `revision` you read. When given, the request is refused (`template_revision_mismatch`) if the draft changed since.
    
</dd>
</dl>

<dl>
<dd>

**defaultLocale:** `Optional<String>` — The locale sends fall back to when they ask for none, or for one without content. Defaults to the first entry of `contents` (or "en").
    
</dd>
</dl>

<dl>
<dd>

**variables:** `Optional<List<TemplateVariableInput>>` — The variables the template uses, with their types.
    
</dd>
</dl>

<dl>
<dd>

**sampleVariables:** `Optional<Map<String, Object>>` — Example values for previews and test sends in the dashboard.
    
</dd>
</dl>

<dl>
<dd>

**contents:** `Optional<List<TemplateContentInput>>` — The subject, HTML and text per locale.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.publish(id, request) -> EmailTemplateVersion</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Copies the draft into the next version, which sends use from then on. Emails already accepted keep the content they were rendered with. A draft without changes since the last publish returns that version, so retrying with the `revision` you reviewed is safe (without it, a retry could publish edits saved in between).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().publish(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    PublishEmailTemplateRequest
        .builder()
        .revision(3L)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>

<dl>
<dd>

**revision:** `Optional<Long>` — The draft `revision` you read. When given, the request is refused (`template_revision_mismatch`) if the draft changed since.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email DedicatedIps
<details><summary><code>client.email.dedicatedIps.get() -> DedicatedIpPool</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The organization's dedicated IP pool (the Dedicated IPs add-on, bought on the dashboard's billing page): its status, its IPs and how much of the last week's mail they delivered. Organization-wide, like domains: every environment's key sees the same pool; only live emails go through it. Without the add-on the status is `not_enabled`.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().dedicatedIps().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Suppressions
<details><summary><code>client.email.suppressions.list() -> SuppressionList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The suppression list of the API key's environment, newest first. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().list(
    ListSuppressionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**address:** `Optional<String>` — Only entries for this address.
    
</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<ListSuppressionsRequestScope>` — Only entries with this scope.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last entry of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.suppressions.add(request) -> Suppression</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Suppresses an address in the API key's environment: later sends skip it, either for every email (`scope: "*"`, the default) or only for emails with the given `category` (e.g. to back an unsubscribe link). Adding an address that is already suppressed with the same scope returns the existing entry with status 200.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().add(
    CreateSuppressionRequest
        .builder()
        .address("user@example.com")
        .scope(
            CreateSuppressionRequestScope.of("marketing")
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**address:** `String` — The address to suppress. Display names are ignored; matching is case-insensitive.
    
</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<CreateSuppressionRequestScope>` — Defaults to `*` (every email). Pass a category, e.g. "marketing", to only skip those.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.suppressions.check() -> SuppressionCheck</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Whether a send to `address` (with `category`, if given) would skip it, and the entries that match: those with scope `*` and, with a `category`, those for that category.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().check(
    CheckSuppressionsRequest
        .builder()
        .address("user@example.com")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**address:** `String` — The address to check.
    
</dd>
</dl>

<dl>
<dd>

**category:** `Optional<String>` — The category of the email you plan to send. Without it, only `*` entries count.
    
</dd>
</dl>

<dl>
<dd>

**stream:** `Optional<CheckSuppressionsRequestStream>` — The stream of the email you plan to send (default `transactional`). `marketing` also counts `stream:marketing` entries.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.suppressions.import_(request) -> SuppressionImport</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds up to 1000 entries at once, with reason `import`. Each entry is validated on its own: invalid ones are skipped and listed in `invalid`, entries already on the list are left unchanged and counted in `existing`. Importing again is safe.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().import_(
    ImportSuppressionsRequest
        .builder()
        .suppressions(
            Arrays.asList(
                ImportSuppressionsRequestSuppressionsItem
                    .builder()
                    .address("user@example.com")
                    .build(),
                ImportSuppressionsRequestSuppressionsItem
                    .builder()
                    .address("other@example.com")
                    .scope("marketing")
                    .build()
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**suppressions:** `List<ImportSuppressionsRequestSuppressionsItem>` — 1-1000 entries. Each one is validated on its own: invalid entries are skipped and reported in `invalid`, the rest are imported.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.suppressions.export() -> String</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The whole suppression list of the API key's environment (optionally filtered), oldest first, as CSV with the columns `address,scope,reason,created_at,email_id,id`. The file can be imported again as is. Values a spreadsheet would run as a formula are prefixed with `'`.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().export(
    ExportSuppressionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**scope:** `Optional<ExportSuppressionsRequestScope>` — Only entries with this scope.
    
</dd>
</dl>

<dl>
<dd>

**reason:** `Optional<ExportSuppressionsRequestReason>` — Only entries with this reason.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.suppressions.get(id) -> Suppression</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().get(
    "sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetSuppressionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The suppression's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.suppressions.remove(id) -> DeletedSuppression</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the entry, so later sends reach the address again (unless another entry still matches). Entries added for bounces and complaints can be removed too.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().suppressions().remove(
    "sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveSuppressionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The suppression's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Tracking
<details><summary><code>client.email.tracking.get() -> TrackingSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The environment's open and click tracking default and its category rules. For each of `opens` and `clicks`, a send's own `tracking` wins, then the rule for its `category`, then the default, then off. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().tracking().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.tracking.removeDefault() -> DeletedTrackingRule</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the environment default: emails without a rule for their category are then not tracked unless the send asks. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().tracking().removeDefault();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.tracking.updateDefault(request) -> TrackingRule</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sets the environment default, which applies to emails without a rule for their category. Fields left out keep their value; if there is no default yet, it is created with them off. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().tracking().updateDefault(
    UpdateTrackingRuleRequest
        .builder()
        .opens(false)
        .clicks(false)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `UpdateTrackingRuleRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.tracking.removeCategory(category) -> DeletedTrackingRule</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Removes the rule: emails of this category follow the environment default again. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().tracking().removeCategory(
    "password-reset",
    RemoveCategoryTrackingRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**category:** `String` — The category, as sent in `category`.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.tracking.updateCategory(category, request) -> TrackingRule</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sets the rule for emails sent with this `category`, which wins over the environment default, e.g. to track `marketing` but never `password-reset`. Fields left out keep their value; a new rule is created with them off. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().tracking().updateCategory(
    "password-reset",
    UpdateCategoryTrackingRequest
        .builder()
        .body(
            UpdateTrackingRuleRequest
                .builder()
                .opens(false)
                .clicks(false)
                .build()
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**category:** `String` — The category, as sent in `category`.
    
</dd>
</dl>

<dl>
<dd>

**request:** `UpdateTrackingRuleRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Contacts
<details><summary><code>client.email.contacts.list() -> ContactList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The contacts of the API key's environment, newest first. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().list(
    ListContactsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**email:** `Optional<String>` — Only the contact with this address.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<ListContactsRequestStatus>` 
    
</dd>
</dl>

<dl>
<dd>

**audienceId:** `Optional<String>` — Only members of this audience.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last contact of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.upsert(request) -> Contact</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates the contact with this address in the API key's environment, or updates the existing one: names are replaced when given, `properties` are merged (`null` removes one), `audience_ids` are added and `topics` choices recorded. `status` only changes when passed.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().upsert(
    UpsertContactRequest
        .builder()
        .email("ada@example.com")
        .firstName("Ada")
        .properties(
            new HashMap<String, Optional<UpsertContactRequestPropertiesValue>>() {{
                put("plan", Optional.of(
                    UpsertContactRequestPropertiesValue.of("pro")
                ));
            }}
        )
        .topics(
            Optional.of(
                Arrays.asList(
                    UpsertContactRequestTopicsItem
                        .builder()
                        .topic("newsletter")
                        .status(UpsertContactRequestTopicsItemStatus.OPTED_IN)
                        .build()
                )
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**email:** `String` — The contact's address. Display names are ignored; matching is case-insensitive.
    
</dd>
</dl>

<dl>
<dd>

**firstName:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**lastName:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**properties:** `Optional<Map<String, Optional<UpsertContactRequestPropertiesValue>>>` — Custom properties by key (define them first, see contact properties). Merged into the contact's existing properties; `null` removes one.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<UpsertContactRequestStatus>` — Sets the contact's consent. Omitted, a new contact is `subscribed` and an existing one keeps its status.
    
</dd>
</dl>

<dl>
<dd>

**audienceIds:** `Optional<List<String>>` — Audiences to add the contact to (it stays in the others).
    
</dd>
</dl>

<dl>
<dd>

**topics:** `Optional<List<UpsertContactRequestTopicsItem>>` — Choices per topic; topics left out keep the contact's choice.
    
</dd>
</dl>

<dl>
<dd>

**doubleOptIn:** `Optional<Boolean>` — Ask the contact to confirm first (default: the marketing settings' `double_opt_in_default`): a new or unsubscribed contact becomes `pending` and gets a confirmation email; it is `subscribed` once they click its link. Can't be combined with `status: "subscribed"`, nor can the default (pass `false` to subscribe directly).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.resendConfirmation(id) -> ContactConfirmation</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends a pending contact (double opt-in) its confirmation email again: at most once a day, and three times before it confirms (`status` says what happened).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().resendConfirmation(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ResendConfirmationContactsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.createPreferenceLinks(id, request) -> PreferenceLinks</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The contact's preference center and unsubscribe links, for emails you build yourself. They never expire. Marketing email sent through coss.com gets them (and one-click unsubscribe headers) automatically. Needs `contact:update`: whoever has the links can change the contact's consent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().createPreferenceLinks(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    CreatePreferenceLinksRequest
        .builder()
        .topic("newsletter")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>

<dl>
<dd>

**topic:** `Optional<String>` — The topic your email is about: its unsubscribe link leaves just that topic.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.import_(request) -> ContactImport</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates or updates up to 1000 contacts at once (source `import`). Each entry is validated on its own: invalid ones are skipped and listed in `invalid`. Existing contacts get the new names and properties, but an import never re-subscribes an unsubscribed contact (`kept_unsubscribed`). Imports send no `contact.*` webhooks. Over the plan's contact limit nothing is imported.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().import_(
    ImportContactsRequest
        .builder()
        .contacts(
            Arrays.asList(
                ImportContactsRequestContactsItem
                    .builder()
                    .email("ada@example.com")
                    .firstName("Ada")
                    .properties(
                        new HashMap<String, Optional<ImportContactsRequestContactsItemPropertiesValue>>() {{
                            put("plan", Optional.of(
                                ImportContactsRequestContactsItemPropertiesValue.of("pro")
                            ));
                        }}
                    )
                    .build(),
                ImportContactsRequestContactsItem
                    .builder()
                    .email("grace@example.com")
                    .status("unsubscribed")
                    .build()
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**contacts:** `List<ImportContactsRequestContactsItem>` 
    
</dd>
</dl>

<dl>
<dd>

**audienceId:** `Optional<String>` — Adds every imported contact to this audience.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.export() -> String</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The contacts of the API key's environment (optionally filtered), oldest first, as CSV with the columns `email,first_name,last_name,status`, one column per custom property, then `created_at,id`. The file can be imported again as is. Values a spreadsheet would run as a formula are prefixed with `'`.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().export(
    ExportContactsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**status:** `Optional<ExportContactsRequestStatus>` 
    
</dd>
</dl>

<dl>
<dd>

**audienceId:** `Optional<String>` — Only members of this audience.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.get(id) -> Contact</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().get(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetContactsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.remove(id) -> DeletedContact</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the contact with its audience memberships and topic choices. Its suppressions stay: they are about the address, not the contact.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().remove(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveContactsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.update(id, request) -> Contact</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the fields given; `properties` are merged (`null` removes one).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().update(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateContactRequest
        .builder()
        .lastName("Byron")
        .properties(
            new HashMap<String, Optional<UpdateContactRequestPropertiesValue>>() {{
                put("seats", Nullable.ofNull());
            }}
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>

<dl>
<dd>

**firstName:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**lastName:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**properties:** `Optional<Map<String, Optional<UpdateContactRequestPropertiesValue>>>` — Custom properties by key (define them first, see contact properties). Merged into the contact's existing properties; `null` removes one.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<UpdateContactRequestStatus>` — Sets the contact's consent. Omitted, a new contact is `subscribed` and an existing one keeps its status.
    
</dd>
</dl>

<dl>
<dd>

**topics:** `Optional<List<UpdateContactRequestTopicsItem>>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.getTopics(id) -> ContactTopics</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every topic of the environment with the contact's choice and whether its emails reach them.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().getTopics(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetTopicsContactsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.updateTopics(id, request) -> ContactTopics</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Records the contact's choices for the topics given; the others keep theirs.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().updateTopics(
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateContactTopicsRequest
        .builder()
        .topics(
            Arrays.asList(
                UpdateContactTopicsRequestTopicsItem
                    .builder()
                    .topic("product")
                    .status(UpdateContactTopicsRequestTopicsItemStatus.OPTED_OUT)
                    .build()
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>

<dl>
<dd>

**topics:** `List<UpdateContactTopicsRequestTopicsItem>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Broadcasts
<details><summary><code>client.email.broadcasts.list() -> BroadcastList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The API key's environment's broadcasts, newest first, with their stats.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().list(
    ListBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**status:** `Optional<ListBroadcastsRequestStatus>` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last broadcast of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.create(request) -> Broadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a draft, or with `send` or `scheduled_at` a broadcast that starts sending (so it needs `broadcast:send` too). A broadcast goes to every contact of its audience or segment who is subscribed, reached by its topic and not suppressed, as one email each, at the plan's marketing rate.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().create(
    CreateBroadcastRequest
        .builder()
        .name("October newsletter")
        .from("Acme <news@acme.com>")
        .subject("What's new, {{{contact.first_name|there}}}")
        .idempotencyKey("welcome-user-123")
        .segmentId("seg_01k7c8m4q2f3e9v6t5r1n0p8yz")
        .topic("newsletter")
        .html("<p>Hi {{{contact.first_name|there}}},</p><p>…</p><p><a href=\"{{{unsubscribe_url}}}\">Unsubscribe</a></p>")
        .scheduledAt(OffsetDateTime.parse("2026-10-20T09:00:00Z"))
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idempotencyKey:** `Optional<String>` — Makes retries safe: a repeated request with the same key and body returns the broadcast created first instead of creating another, for 24 hours. 1-256 characters.
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` — Shown only to you.
    
</dd>
</dl>

<dl>
<dd>

**audienceId:** `Optional<String>` — Send to this audience…
    
</dd>
</dl>

<dl>
<dd>

**segmentId:** `Optional<String>` — …or to this segment (one of the two).
    
</dd>
</dl>

<dl>
<dd>

**topic:** `Optional<String>` — The topic the broadcast is about (its key): only contacts it reaches get it, and its unsubscribe link leaves just that topic. It is the emails' `category`.
    
</dd>
</dl>

<dl>
<dd>

**from:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**replyTo:** `Optional<List<String>>` 
    
</dd>
</dl>

<dl>
<dd>

**subject:** `String` — May use `{{{contact.<key>|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).
    
</dd>
</dl>

<dl>
<dd>

**previewText:** `Optional<String>` — The inbox preview line (a hidden preheader at the start of the HTML).
    
</dd>
</dl>

<dl>
<dd>

**html:** `Optional<String>` — `{{{contact.<key>|fallback}}}` for contact fields and properties (escaped), and `{{{unsubscribe_url}}}`, `{{{preferences_url}}}`, `{{{mailing_address}}}`; a footer with the postal address and an unsubscribe link is added unless they are there.
    
</dd>
</dl>

<dl>
<dd>

**text:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**tracking:** `Optional<CreateBroadcastRequestTracking>` 
    
</dd>
</dl>

<dl>
<dd>

**ratePerSecond:** `Optional<Integer>` — Recipients per second, at most the plan's marketing rate (the default).
    
</dd>
</dl>

<dl>
<dd>

**send:** `Optional<Boolean>` — Start sending right away.
    
</dd>
</dl>

<dl>
<dd>

**scheduledAt:** `Optional<OffsetDateTime>` — Start sending at this time (ISO 8601 with an offset, at most 30 days ahead).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.get(id) -> Broadcast</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().get(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.remove(id) -> DeletedBroadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes a draft, or a broadcast canceled before any of its emails were made.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().remove(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.update(id, request) -> Broadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes a draft; fields left out keep their value, `null` clears one.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().update(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateBroadcastRequest
        .builder()
        .subject("Our October news")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>

<dl>
<dd>

**name:** `Optional<String>` — Shown only to you.
    
</dd>
</dl>

<dl>
<dd>

**audienceId:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**segmentId:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**topic:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**replyTo:** `Optional<List<String>>` 
    
</dd>
</dl>

<dl>
<dd>

**subject:** `Optional<String>` — May use `{{{contact.<key>|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).
    
</dd>
</dl>

<dl>
<dd>

**previewText:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**html:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**text:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**tracking:** `Optional<UpdateBroadcastRequestTracking>` 
    
</dd>
</dl>

<dl>
<dd>

**ratePerSecond:** `Optional<Integer>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.send(id, request) -> Broadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Starts sending a draft, now or at `scheduled_at`. Sending a broadcast that already started returns it as it is.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().send(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    SendBroadcastRequest
        .builder()
        .scheduledAt(OffsetDateTime.parse("2026-10-20T09:00:00Z"))
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>

<dl>
<dd>

**scheduledAt:** `Optional<OffsetDateTime>` — Omit to start right away.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.cancel(id) -> Broadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Stops it for good: its emails not yet handed to the provider are dropped (the ones on their way still go). Canceling a canceled broadcast returns it.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().cancel(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    CancelBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.pause(id) -> Broadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Pauses a scheduled or sending broadcast; emails not yet handed to the provider are dropped and made again when it is resumed.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().pause(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    PauseBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.resume(id) -> Broadcast</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Resumes a paused broadcast where it stopped.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().resume(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ResumeBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.test(id, request) -> BroadcastTest</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends its content to up to 5 addresses as ordinary marketing emails (subject prefixed `[Test]`), filled with `contact`'s values or the fallbacks. They count like any send.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().test(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    TestBroadcastRequest
        .builder()
        .to(
            Arrays.asList("me@acme.com")
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>

<dl>
<dd>

**to:** `List<String>` 
    
</dd>
</dl>

<dl>
<dd>

**contact:** `Optional<String>` — A contact (id or address) whose values fill the template; default: fallbacks.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.broadcasts.listEmails(id) -> BroadcastEmailList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The emails made so far, one per contact, newest first.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().broadcasts().listEmails(
    "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListEmailsBroadcastsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The broadcast's id.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last email of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Audiences
<details><summary><code>client.email.audiences.list() -> AudienceList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The static contact lists of the API key's environment, newest first.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().list(
    ListAudiencesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last item of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.create(request) -> Audience</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().create(
    CreateAudienceRequest
        .builder()
        .name("Beta testers")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.get(id) -> Audience</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().get(
    "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetAudiencesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audience's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.remove(id) -> DeletedAudience</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the audience; its contacts stay. Refused while a segment filters on it (`audience_in_use`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().remove(
    "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveAudiencesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audience's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.update(id, request) -> Audience</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().update(
    "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateAudienceRequest
        .builder()
        .name("Early access")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audience's id.
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.listContacts(id) -> ContactList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The audience's members, whatever their status, newest first.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().listContacts(
    "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListContactsAudiencesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audience's id.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last item of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.addContacts(id, request) -> AudienceContactsAdded</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds existing contacts, by id or address. Members already in it are counted in `existing`; unknown ones are listed in `missing` (create them first).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().addContacts(
    "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
    AddAudienceContactsRequest
        .builder()
        .contacts(
            Arrays.asList("contact_01k7c8m4q2f3e9v6t5r1n0p8yz", "grace@example.com")
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audience's id.
    
</dd>
</dl>

<dl>
<dd>

**contacts:** `List<String>` — Contact ids or addresses of existing contacts.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.audiences.removeContact(id, contactId) -> RemoveContactAudiencesResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().audiences().removeContact(
    "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveContactAudiencesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The audience's id.
    
</dd>
</dl>

<dl>
<dd>

**contactId:** `String` — The contact's id, or its address (URL-encoded).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Segments
<details><summary><code>client.email.segments.list() -> SegmentList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The segments (contact filters) of the API key's environment, newest first.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().segments().list(
    ListSegmentsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last item of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.segments.create(request) -> Segment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A segment is a filter over the environment's contacts, evaluated whenever it is used, so its contacts are always current.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().segments().create(
    CreateSegmentRequest
        .builder()
        .name("Pro customers")
        .filter(
            SegmentFilter
                .builder()
                .version(1.0)
                .match(SegmentFilterMatch.ALL)
                .conditions(
                    Arrays.asList(
                        SegmentFilterConditionsItem.of(
                            SegmentFilterConditionsItemKey
                                .builder()
                                .field(SegmentFilterConditionsItemKeyField.PROPERTY)
                                .key("plan")
                                .op(SegmentFilterConditionsItemKeyOp.EQ)
                                .value(
                                    Optional.of(
                                        SegmentFilterConditionsItemKeyValue.of("pro")
                                    )
                                )
                                .build()
                        ),
                        SegmentFilterConditionsItem.of(
                            SegmentFilterConditionsItemConditions
                                .builder()
                                .match(SegmentFilterConditionsItemConditionsMatch.ANY)
                                .conditions(
                                    Arrays.asList(
                                        SegmentFilterConditionsItemConditionsConditionsItem.email(
                                            SegmentFilterConditionsItemConditionsConditionsItemEmail
                                                .builder()
                                                .op(SegmentFilterConditionsItemConditionsConditionsItemEmailOp.ENDS_WITH)
                                                .value("@acme.com")
                                                .build()
                                        ),
                                        SegmentFilterConditionsItemConditionsConditionsItem.audience(
                                            SegmentFilterConditionsItemConditionsConditionsItemAudience
                                                .builder()
                                                .op(SegmentFilterConditionsItemConditionsConditionsItemAudienceOp.IN)
                                                .audienceId("aud_01k7c8m4q2f3e9v6t5r1n0p8yz")
                                                .build()
                                        )
                                    )
                                )
                                .build()
                        )
                    )
                )
                .build()
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**filter:** `SegmentFilter` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.segments.get(id) -> Segment</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().segments().get(
    "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetSegmentsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The segment's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.segments.remove(id) -> DeletedSegment</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().segments().remove(
    "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveSegmentsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The segment's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.segments.update(id, request) -> Segment</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().segments().update(
    "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateSegmentRequest
        .builder()
        .name("Pro and Scale customers")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The segment's id.
    
</dd>
</dl>

<dl>
<dd>

**name:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**filter:** `Optional<SegmentFilter>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.segments.listContacts(id) -> ContactList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The contacts the segment's filter matches now, whatever their status, newest first. A broadcast to the segment goes only to the subscribed ones its topic reaches.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().segments().listContacts(
    "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListContactsSegmentsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The segment's id.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last item of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Topics
<details><summary><code>client.email.topics.list() -> TopicList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The subscription topics of the API key's environment.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().topics().list(
    ListTopicsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last item of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.topics.create(request) -> Topic</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A topic is what contacts subscribe to, built on categories: emails sent with `category` equal to the topic's `key` are about it, so contacts who opted out (or, for an `opt_out` topic, never opted in) are skipped. Public topics show in the preference center.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().topics().create(
    CreateTopicRequest
        .builder()
        .key("newsletter")
        .name("Newsletter")
        .defaultSubscription(CreateTopicRequestDefaultSubscription.OPT_IN)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**key:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**defaultSubscription:** `CreateTopicRequestDefaultSubscription` — `opt_in`: every subscribed contact gets the topic's emails unless they opt out. `opt_out`: only contacts who opted in do.
    
</dd>
</dl>

<dl>
<dd>

**visibility:** `Optional<CreateTopicRequestVisibility>` — `private` topics never show in the preference center (default `public`).
    
</dd>
</dl>

<dl>
<dd>

**position:** `Optional<Integer>` — Order in the preference center (ascending).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.topics.get(id) -> Topic</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().topics().get(
    "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetTopicsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The topic's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.topics.remove(id) -> DeletedTopic</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the topic and every contact's choice for it. Refused while a segment filters on it (`topic_in_use`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().topics().remove(
    "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveTopicsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The topic's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.topics.update(id, request) -> Topic</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the fields given; the key can't change.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().topics().update(
    "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateTopicRequest
        .builder()
        .visibility(UpdateTopicRequestVisibility.PRIVATE)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The topic's id.
    
</dd>
</dl>

<dl>
<dd>

**name:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**defaultSubscription:** `Optional<UpdateTopicRequestDefaultSubscription>` — `opt_in`: every subscribed contact gets the topic's emails unless they opt out. `opt_out`: only contacts who opted in do.
    
</dd>
</dl>

<dl>
<dd>

**visibility:** `Optional<UpdateTopicRequestVisibility>` — `private` topics never show in the preference center (default `public`).
    
</dd>
</dl>

<dl>
<dd>

**position:** `Optional<Integer>` — Order in the preference center (ascending).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email MarketingSettings
<details><summary><code>client.email.marketingSettings.get() -> MarketingSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The API key's environment's sender name and the postal address its marketing emails carry.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().marketingSettings().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.marketingSettings.update(request) -> MarketingSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the fields given (`null` clears one).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().marketingSettings().update(
    UpdateMarketingSettingsRequest
        .builder()
        .mailingAddress("Acme Inc., 548 Market St, San Francisco, CA 94104, USA")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**displayName:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**mailingAddress:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**doubleOptInDefault:** `Optional<Boolean>` 
    
</dd>
</dl>

<dl>
<dd>

**confirmationFrom:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**confirmationSubject:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**confirmationHtml:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**confirmationText:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**confirmedRedirectUrl:** `Optional<String>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Received
<details><summary><code>client.email.received.list() -> ReceivedEmailList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Emails received by the API key's environment, newest first, without their bodies and headers (retrieve one for those). Pass the last `id` as `after` to get the next page while `has_more` is true. An `email.received` webhook announces each one as it arrives.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().received().list(
    ListReceivedRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 20.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last email of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.received.address() -> InboundAddress</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The environment's own domain under coss.com's inbound domain: email sent to any address at it (e.g. `support@<domain>`) is received by this environment, with no DNS setup. To receive at your own domain, add a receiving domain instead.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().received().address();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.received.get(id) -> ReceivedEmail</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The received email with its headers, text and HTML bodies (each cut at 2 MB, see `truncated`) and attachment metadata. HTML is the sender's: sanitize it before showing it to anyone.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().received().get(
    "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetReceivedRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The received email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.received.delete(id) -> DeletedReceivedEmail</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the received email with its raw message and attachments right away, instead of at the end of its retention period.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().received().delete(
    "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteReceivedRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The received email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.received.getRaw(id) -> InputStream</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The whole message as received (`message/rfc822`), for your own MIME parser or archive.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().received().getRaw(
    "id",
    GetRawReceivedRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The received email's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.received.getAttachment(id, attachmentId) -> InputStream</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The attachment's bytes, always as `application/octet-stream` (its declared type is the attachment's `content_type`): treat them as untrusted.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().received().getAttachment(
    "id",
    "attachment_id",
    GetAttachmentReceivedRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The received email's id.
    
</dd>
</dl>

<dl>
<dd>

**attachmentId:** `String` — The attachment's id (from the received email's `attachments`).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Contacts Properties
<details><summary><code>client.email.contacts.properties.list() -> ContactPropertyList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every custom contact property of the API key's environment (at most 50), by key.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().properties().list();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.properties.create(request) -> ContactProperty</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Defines a custom property contacts can have. Its key and type can't change; `fallback` is what templates use for contacts without a value.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().properties().create(
    CreateContactPropertyRequest
        .builder()
        .key("plan")
        .type(CreateContactPropertyRequestType.STRING)
        .fallback(
            CreateContactPropertyRequestFallback.of("free")
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**key:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**type:** `CreateContactPropertyRequestType` 
    
</dd>
</dl>

<dl>
<dd>

**fallback:** `Optional<CreateContactPropertyRequestFallback>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.properties.get(id) -> ContactProperty</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().properties().get(
    "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetPropertiesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The property's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.properties.remove(id) -> DeletedContactProperty</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the property and removes its values from every contact. Refused while a segment filters on it (`property_in_use`).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().properties().remove(
    "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemovePropertiesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The property's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.contacts.properties.update(id, request) -> ContactProperty</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().contacts().properties().update(
    "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateContactPropertyRequest
        .builder()
        .fallback(
            UpdateContactPropertyRequestFallback.of("starter")
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The property's id.
    
</dd>
</dl>

<dl>
<dd>

**fallback:** `Optional<UpdateContactPropertyRequestFallback>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Templates Versions
<details><summary><code>client.email.templates.versions.list(id) -> EmailTemplateVersionList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Published versions, newest first. Pass the last `version` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().versions().list(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListVersionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-20, default 10.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<Long>` — Cursor: the `version` of the last version of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.versions.get(id, version) -> EmailTemplateVersion</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A published version, which never changes.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().versions().get(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    1L,
    GetVersionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>

<dl>
<dd>

**version:** `Long` — A published version number.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.email.templates.versions.restore(id, version) -> EmailTemplateVersion</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces the draft with a published version's variables and content. Publish the draft to make sends use it again.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.email().templates().versions().restore(
    "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
    1L,
    RestoreVersionsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The template's id or alias.
    
</dd>
</dl>

<dl>
<dd>

**version:** `Long` — A published version number.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks EventTypes
<details><summary><code>client.hooks.eventTypes.list() -> HookEventTypeList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The environment's event types by name; archived ones only with `include_archived`.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().eventTypes().list(
    ListEventTypesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**includeArchived:** `Optional<ListEventTypesRequestIncludeArchived>` — Also list archived types (default `false`).
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `name` of the last type of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.eventTypes.create(request) -> HookEventType</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds a type to the catalog your applications' users subscribe from (in the portal, or the `filter_types` of an endpoint), with a description, a JSON Schema and examples to show them. Messages can be sent with any type, registered or not. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().eventTypes().create(
    CreateHookEventTypeRequest
        .builder()
        .name("invoice.paid")
        .description("An invoice was paid in full.")
        .examples(
            Optional.of(
                Arrays.asList(
                    new HashMap<String, Object>() {{
                        put("invoice_id", "in_1042");
                        put("amount", 4200);
                        put("currency", "usd");
                    }}
                )
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**schema:** `Optional<Map<String, Object>>` — A JSON Schema of the payload, shown to your users (not enforced).
    
</dd>
</dl>

<dl>
<dd>

**examples:** `Optional<List<Map<String, Object>>>` — Up to 5 example payloads; the first is what a test send delivers.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.eventTypes.get(name) -> HookEventType</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

An event type of the API key's environment, archived or not.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().eventTypes().get(
    "invoice.paid",
    GetEventTypesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — The event type's name.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.eventTypes.archive(name) -> HookEventType</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Hides the type from the portal and from new subscriptions. Endpoints already subscribed keep receiving it. Restore it with `PATCH … { archived: false }`.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().eventTypes().archive(
    "invoice.paid",
    ArchiveEventTypesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — The event type's name.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.eventTypes.update(name, request) -> HookEventType</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes its description, schema or examples, or archives or restores it.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().eventTypes().update(
    "invoice.paid",
    UpdateHookEventTypeRequest
        .builder()
        .archived(false)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — The event type's name.
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**schema:** `Optional<Map<String, Object>>` — A JSON Schema of the payload, shown to your users (not enforced).
    
</dd>
</dl>

<dl>
<dd>

**examples:** `Optional<List<Map<String, Object>>>` — Up to 5 example payloads; the first is what a test send delivers.
    
</dd>
</dl>

<dl>
<dd>

**archived:** `Optional<Boolean>` — `false` restores an archived type.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Applications
<details><summary><code>client.hooks.applications.list() -> HookApplicationList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The environment's applications, newest first. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().applications().list(
    ListApplicationsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last application of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.applications.create(request) -> HookApplication</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates an application: one of your customers (or users), who gets their own endpoints and portal. Give it a `uid` (e.g. your customer's id) to address it by in every path. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().applications().create(
    CreateHookApplicationRequest
        .builder()
        .name("Acme Corp")
        .uid("customer_8812")
        .metadata(
            new HashMap<String, String>() {{
                put("plan", "pro");
            }}
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — Shown to the application's users in the portal.
    
</dd>
</dl>

<dl>
<dd>

**uid:** `Optional<String>` — Your own id for it, to address it by in every path instead of its `id`.
    
</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, String>>` — Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.applications.get(application) -> HookApplication</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

An application of the API key's environment, by its id or uid.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().applications().get(
    "customer_8812",
    GetApplicationsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.applications.delete(application) -> DeletedHookApplication</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the application with its endpoints and portal sessions; pending deliveries stop. Its messages are no longer reachable and are deleted with the rest of their day's data.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().applications().delete(
    "customer_8812",
    DeleteApplicationsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.applications.update(application, request) -> HookApplication</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the name, uid or metadata. Fields left out keep their value.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().applications().update(
    "customer_8812",
    UpdateHookApplicationRequest
        .builder()
        .name("Acme Corporation")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**name:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**uid:** `Optional<String>` — `null` removes it.
    
</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, String>>` — Replaces the metadata.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Endpoints
<details><summary><code>client.hooks.endpoints.list(application) -> HookEndpointList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The application's endpoints, oldest first. Secrets are never included.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().list(
    "customer_8812",
    ListEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.create(application, request) -> HookEndpointWithSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Registers a URL of the application's user that receives its messages, each request signed (Standard Webhooks) with the endpoint's own secret, returned here. Usually your users add endpoints themselves in the portal. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().create(
    "customer_8812",
    CreateHookEndpointRequest
        .builder()
        .url("https://example.com/webhooks")
        .filterTypes(
            Optional.of(
                Arrays.asList("invoice.paid")
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**url:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**filterTypes:** `Optional<List<String>>` — Event types delivered to this endpoint (existing, unarchived ones). An empty array means every type, including ones added later.
    
</dd>
</dl>

<dl>
<dd>

**secret:** `Optional<String>` — A `whsec_` + base64 secret of 24-64 bytes to sign with, e.g. when migrating from another provider. Generated when omitted.
    
</dd>
</dl>

<dl>
<dd>

**rateLimitPerSecond:** `Optional<Integer>` — At most this many requests per second to this endpoint.
    
</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, String>>` — Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Optional<Boolean>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.get(application, endpointId) -> HookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

An endpoint of the application.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().get(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.delete(application, endpointId) -> DeletedHookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the endpoint; its pending deliveries fail. Its delivery log stays.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().delete(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.update(application, endpointId, request) -> HookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the URL, description, filter types, rate limit, metadata or `enabled`. Enabling it again clears a failure streak. The secret stays the same (see roll secret).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().update(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateHookEndpointRequest
        .builder()
        .enabled(false)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**url:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**filterTypes:** `Optional<List<String>>` — Event types delivered to this endpoint (existing, unarchived ones). An empty array means every type, including ones added later.
    
</dd>
</dl>

<dl>
<dd>

**rateLimitPerSecond:** `Optional<Integer>` — At most this many requests per second to this endpoint.
    
</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, String>>` — Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Optional<Boolean>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.getSecret(application, endpointId) -> HookEndpointSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The endpoint's current signing secret, e.g. to show its user. Needs `hook:update`, like rolling it.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().getSecret(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetSecretEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.rollSecret(application, endpointId, request) -> HookEndpointWithSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces the signing secret, returned here. Until `previous_secret_expires_at`, requests carry a signature with each secret, so the receiver can switch without rejecting any. Not idempotent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().rollSecret(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RollHookEndpointSecretRequest
        .builder()
        .previousSecretExpiresIn(3600)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**previousSecretExpiresIn:** `Optional<Integer>` — Seconds the current secret keeps signing next to the new one. Default 86400 (a day), at most 604800 (a week); `0` stops it immediately.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.recover(application, endpointId, request) -> HookEndpointRecovery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues every delivery to the endpoint that failed, of messages sent since `since`, for one more attempt each, e.g. after its receiver was down. coss.com works through them in the background (oldest first); follow `status` with the returned recovery. The endpoint must be enabled.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().recover(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RecoverHookEndpointRequest
        .builder()
        .since(OffsetDateTime.parse("2026-01-15T00:00:00Z"))
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**since:** `OffsetDateTime` — Requeue deliveries that failed, of messages sent from this time until now.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.getRecovery(application, endpointId, recoveryId) -> HookEndpointRecovery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A recovery of the endpoint: `pending` while deliveries are still being requeued.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().getRecovery(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    "hrec_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetRecoveryEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**recoveryId:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.sendTest(application, endpointId, request) -> HookMessage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends a message to this endpoint only (whatever its filter), with the given payload or the event type's first example. It counts against the send quota like any message.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().sendTest(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    SendHookTestRequest
        .builder()
        .eventType("invoice.paid")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**eventType:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**payload:** `Optional<Map<String, Object>>` — Defaults to the event type's first example.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.endpoints.listDeliveries(application, endpointId) -> HookDeliveryList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The endpoint's deliveries, newest first.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().endpoints().listDeliveries(
    "customer_8812",
    "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListDeliveriesEndpointsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**endpointId:** `String` — The endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<ListDeliveriesEndpointsRequestStatus>` — Only deliveries with this status.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last delivery of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Messages
<details><summary><code>client.hooks.messages.list(application) -> HookMessageList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The application's messages, newest first (kept for 30 days).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().messages().list(
    "customer_8812",
    ListMessagesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**eventType:** `Optional<String>` — Only messages of this type.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last message of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.messages.send(application, request) -> HookMessage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues a message to the application: coss.com delivers it to each of its enabled endpoints subscribed to `event_type` within seconds, signed with each endpoint's secret, and retries failures with backoff for about a day. Each request's `webhook-id` header is the message's id. Counts against the send quota once per endpoint it goes to (at least once). Live sends are refused while the organization is suspended (`account_suspended`). Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().messages().send(
    "customer_8812",
    SendHookMessageRequest
        .builder()
        .eventType("invoice.paid")
        .idempotencyKey("invoice-1042-paid")
        .payload(
            new HashMap<String, Object>() {{
                put("invoice_id", "in_1042");
                put("amount", 4200);
                put("currency", "usd");
            }}
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**idempotencyKey:** `Optional<String>` — Makes retries safe: a repeated request with the same key and body returns the original message instead of sending again, for 24 hours. 1-256 characters.
    
</dd>
</dl>

<dl>
<dd>

**eventType:** `String` — What happened, e.g. `invoice.paid`. Endpoints that filter by type only get the types they chose. The type doesn't have to be registered.
    
</dd>
</dl>

<dl>
<dd>

**payload:** `Map<String, Object>` — The JSON object delivered as the request body (at most 256 KB serialized). It is parsed and serialized again: send integers beyond 2^53 as strings.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.messages.get(application, messageId) -> HookMessage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

A message of the application, with its payload.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().messages().get(
    "customer_8812",
    "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetMessagesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**messageId:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.messages.listDeliveries(application, messageId) -> HookDeliveryList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One delivery per endpoint the message went to.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().messages().listDeliveries(
    "customer_8812",
    "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListDeliveriesMessagesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**messageId:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Deliveries
<details><summary><code>client.hooks.deliveries.get(application, deliveryId) -> HookDelivery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One message's delivery to one endpoint.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().deliveries().get(
    "customer_8812",
    "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetDeliveriesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**deliveryId:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.deliveries.listAttempts(application, deliveryId) -> HookAttemptList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every HTTP request of the delivery, oldest first, with response excerpts.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().deliveries().listAttempts(
    "customer_8812",
    "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListAttemptsDeliveriesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**deliveryId:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hooks.deliveries.retry(application, deliveryId) -> HookDelivery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues a finished delivery for one more attempt within seconds, to the endpoint's current URL and secret. A `pending` delivery is returned unchanged.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().deliveries().retry(
    "customer_8812",
    "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RetryDeliveriesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**deliveryId:** `String` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Portal
<details><summary><code>client.hooks.portal.createSession(application, request) -> HookPortalSession</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Signs the application's user in to the portal, where they add endpoints, pick event types, see deliveries and retry them, without you building any UI. Create one each time the user opens it (from your backend: never expose the API key) and open or embed the returned `url`; embedding needs the site's origin in the environment's portal settings.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hooks().portal().createSession(
    "customer_8812",
    CreateHookPortalSessionRequest
        .builder()
        .expiresIn(3600)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**application:** `String` — The application's `id` (`happ_…`) or your `uid` for it.
    
</dd>
</dl>

<dl>
<dd>

**expiresIn:** `Optional<Integer>` — Seconds until it expires: default 3600, at most 86400.
    
</dd>
</dl>

<dl>
<dd>

**readOnly:** `Optional<Boolean>` — The user can look but not change anything.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## LogDrains Batches
<details><summary><code>client.logDrains.batches.list(id) -> LogDrainBatchList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The drain's delivery log, newest first: one batch per NDJSON request, with every HTTP attempt. A failing batch is retried with backoff for about a day (10 attempts); if every attempt fails, the drain is disabled. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().batches().list(
    "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListBatchesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The log drain's id.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<ListBatchesRequestStatus>` — Only batches with this status.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last batch of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.logDrains.batches.get(id, batchId) -> LogDrainBatch</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One batch of the drain, with every HTTP attempt.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.logDrains().batches().get(
    "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
    "drainbat_01k7c8n2b5d7f9h1k3m5p7r9tv",
    GetBatchesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The log drain's id.
    
</dd>
</dl>

<dl>
<dd>

**batchId:** `String` — The batch's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Assessments
<details><summary><code>client.risk.assessments.list() -> RiskAssessmentList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The assessments of the API key's environment, newest first. `review_status=open` is the review queue. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().assessments().list(
    ListAssessmentsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**event:** `Optional<RiskEvent>` — What is being assessed. `custom` events are named by `event_name`; velocity is counted per event.
    
</dd>
</dl>

<dl>
<dd>

**decision:** `Optional<RiskDecision>` — `allow`: go ahead. `review`: suspicious; let it through with limits, or hold it for a person. `block`: refuse it.
    
</dd>
</dl>

<dl>
<dd>

**userId:** `Optional<String>` — Only assessments of this user.
    
</dd>
</dl>

<dl>
<dd>

**reviewStatus:** `Optional<ListAssessmentsRequestReviewStatus>` — `open`: the review queue.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last entry of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.assessments.get(id) -> RiskAssessment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The email address and IP address are removed 90 days after the assessment; the decision, reasons and signals stay for a year.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().assessments().get(
    "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetAssessmentsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The assessment's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Lists
<details><summary><code>client.risk.lists.list() -> RiskListEntryList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The environment's list entries, newest first. Pass the last `id` as `after` to get the next page while `has_more` is true.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().lists().list(
    ListListsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**list:** `Optional<RiskList>` 
    
</dd>
</dl>

<dl>
<dd>

**type:** `Optional<RiskListEntryType>` — `email` (matched by mailbox, dots and `+tags` folded), `domain` (subdomains included), `ip` (an address or CIDR range), `asn`, `country` (ISO 3166-1 alpha-2), `user` (your user id).
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last entry of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.lists.add(request) -> RiskListEntry</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds an email address (matched by mailbox), domain (with its subdomains), IP address or CIDR range, AS number, country or user id to the environment's allow or block list. An allow-list match makes the decision `allow` whatever else fired; a block-list match makes it `block`. Adding an entry that already exists returns it with status 200.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().lists().add(
    CreateRiskListEntryRequest
        .builder()
        .list(RiskList.BLOCK)
        .type(RiskListEntryType.DOMAIN)
        .value("evil.example")
        .note("Card testing")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**list:** `RiskList` 
    
</dd>
</dl>

<dl>
<dd>

**type:** `RiskListEntryType` 
    
</dd>
</dl>

<dl>
<dd>

**value:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**note:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**expiresAt:** `Optional<OffsetDateTime>` — The entry stops matching at this time (it is kept until deleted).
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.lists.get(id) -> RiskListEntry</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().lists().get(
    "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetListsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The list entry's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.lists.remove(id) -> DeletedRiskListEntry</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().lists().remove(
    "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz",
    RemoveListsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The list entry's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Users
<details><summary><code>client.risk.users.forget(userId) -> ForgottenRiskUser</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Call this when you delete one of your users: coss.com deletes what identifies them in the environment (their mailbox, fraud reports, and the user id, email address, IP address and user agent on their assessments). Decisions and reasons stay. Forgetting a user coss.com doesn't know succeeds too.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().users().forget(
    "u_42",
    ForgetUsersRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**userId:** `String` — Your id for the user.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Settings
<details><summary><code>client.risk.settings.get() -> RiskSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The API key's environment's decision thresholds, disabled reasons and captcha provider (never its secret).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().settings().get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.settings.update(request) -> RiskSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the fields given. `review_threshold` must not exceed `block_threshold`. Disabled reasons never fire (rules still see the facts behind them). Setting a captcha provider makes assessments verify their `captcha.token` with it; `required` adds `captcha.missing` to assessments without one. `reason_weights` replaces reasons' default weights (for example with calibration's `suggested_weight`); `null` restores a default.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().settings().update(
    UpdateRiskSettingsRequest
        .builder()
        .blockThreshold(0.9)
        .captcha(
            UpdateRiskSettingsRequestCaptcha
                .builder()
                .provider(UpdateRiskSettingsRequestCaptchaProvider.TURNSTILE)
                .secret("0x4AAA…")
                .required(true)
                .build()
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**reviewThreshold:** `Optional<Double>` 
    
</dd>
</dl>

<dl>
<dd>

**blockThreshold:** `Optional<Double>` 
    
</dd>
</dl>

<dl>
<dd>

**disabledReasons:** `Optional<List<UpdateRiskSettingsRequestDisabledReasonsItem>>` 
    
</dd>
</dl>

<dl>
<dd>

**captcha:** `Optional<UpdateRiskSettingsRequestCaptcha>` — `null` turns captcha verification off and deletes the secret.
    
</dd>
</dl>

<dl>
<dd>

**contentThresholds:** `Optional<UpdateRiskSettingsRequestContentThresholds>` — Changes the categories given: a score in (0, 1] sets the threshold, `null` removes it.
    
</dd>
</dl>

<dl>
<dd>

**reasonWeights:** `Optional<UpdateRiskSettingsRequestReasonWeights>` — Changes the reasons given: a weight in [0, 0.99] replaces the default, `null` goes back to it.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Rules
<details><summary><code>client.risk.rules.list() -> RiskRuleList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every rule of the API key's environment, in evaluation order.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().rules().list();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.rules.create(request) -> RiskRule</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Rules decide after the allow and block lists and before the score thresholds: the first enabled rule (lowest `position`, then oldest) whose conditions match the event sets the decision to its `action`. Conditions test the fields listed in the docs; a field without a value (no IP, no email) never matches. At most 50 rules per environment.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().rules().create(
    CreateRiskRuleRequest
        .builder()
        .name("Disposable email from a data center")
        .action(RiskDecision.BLOCK)
        .conditions(
            Arrays.asList(
                RiskRuleCondition
                    .builder()
                    .field(RiskRuleConditionField.EMAIL_DISPOSABLE)
                    .operator(RiskRuleConditionOperator.IS)
                    .value(
                        RiskRuleConditionValue.of(true)
                    )
                    .build(),
                RiskRuleCondition
                    .builder()
                    .field(RiskRuleConditionField.IP_HOSTING)
                    .operator(RiskRuleConditionOperator.IS)
                    .value(
                        RiskRuleConditionValue.of(true)
                    )
                    .build()
            )
        )
        .events(
            Optional.of(
                Arrays.asList(RiskEvent.SIGNUP)
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Optional<Boolean>` 
    
</dd>
</dl>

<dl>
<dd>

**position:** `Optional<Integer>` — Default 0.
    
</dd>
</dl>

<dl>
<dd>

**events:** `Optional<List<RiskEvent>>` 
    
</dd>
</dl>

<dl>
<dd>

**match:** `Optional<CreateRiskRuleRequestMatch>` — Default `all`.
    
</dd>
</dl>

<dl>
<dd>

**conditions:** `List<RiskRuleCondition>` 
    
</dd>
</dl>

<dl>
<dd>

**action:** `RiskDecision` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.rules.get(id) -> RiskRule</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().rules().get(
    "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetRulesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The rule's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.rules.delete(id) -> DeletedRiskRule</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().rules().delete(
    "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteRulesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The rule's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.rules.update(id, request) -> RiskRule</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the fields given; `conditions` replaces the whole list.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().rules().update(
    "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateRiskRuleRequest
        .builder()
        .enabled(false)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The rule's id.
    
</dd>
</dl>

<dl>
<dd>

**name:** `Optional<String>` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Optional<Boolean>` 
    
</dd>
</dl>

<dl>
<dd>

**position:** `Optional<Integer>` 
    
</dd>
</dl>

<dl>
<dd>

**events:** `Optional<List<RiskEvent>>` 
    
</dd>
</dl>

<dl>
<dd>

**match:** `Optional<UpdateRiskRuleRequestMatch>` 
    
</dd>
</dl>

<dl>
<dd>

**conditions:** `Optional<List<RiskRuleCondition>>` 
    
</dd>
</dl>

<dl>
<dd>

**action:** `Optional<RiskDecision>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk LimitBuckets
<details><summary><code>client.risk.limitBuckets.list() -> RiskLimitBucketList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Every bucket of the API key's environment, by name.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().limitBuckets().list();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.limitBuckets.create(request) -> RiskLimitBucket</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

At most 100 buckets per environment; names are unique in it.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().limitBuckets().create(
    CreateRiskLimitBucketRequest
        .builder()
        .name("password_reset")
        .limit(5)
        .periodSeconds(3600)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**name:** `String` — Unique in the environment; can't be changed.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Integer` — Tokens added per `period_seconds`.
    
</dd>
</dl>

<dl>
<dd>

**periodSeconds:** `Integer` — 1 second to 1 day.
    
</dd>
</dl>

<dl>
<dd>

**burst:** `Optional<Integer>` — How many requests a key can make at once. Defaults to `limit`.
    
</dd>
</dl>

<dl>
<dd>

**onFailure:** `Optional<CreateRiskLimitBucketRequestOnFailure>` — The answer while coss.com can't count. Defaults to `allow`.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.limitBuckets.get(id) -> RiskLimitBucket</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().limitBuckets().get(
    "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz",
    GetLimitBucketsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The bucket's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.limitBuckets.delete(id) -> DeletedRiskLimitBucket</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Checks naming it get a 404 from then on; a new bucket with its name starts empty.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().limitBuckets().delete(
    "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz",
    DeleteLimitBucketsRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The bucket's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.risk.limitBuckets.update(id, request) -> RiskLimitBucket</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the fields given; the next check uses them. Keys keep what they spent, so a smaller bucket can deny a key until it refills.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.risk().limitBuckets().update(
    "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz",
    UpdateRiskLimitBucketRequest
        .builder()
        .limit(10)
        .burst(20)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The bucket's id.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` 
    
</dd>
</dl>

<dl>
<dd>

**periodSeconds:** `Optional<Integer>` 
    
</dd>
</dl>

<dl>
<dd>

**burst:** `Optional<Integer>` 
    
</dd>
</dl>

<dl>
<dd>

**onFailure:** `Optional<UpdateRiskLimitBucketRequestOnFailure>` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## WebhookEndpoints Deliveries
<details><summary><code>client.webhookEndpoints.deliveries.list(id) -> WebhookDeliveryList</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The endpoint's delivery log, newest first: one delivery per event sent to it, with every HTTP attempt and the payload as sent. Pass the last `id` as `after` to get the next page while `has_more` is true. Deleting the endpoint deletes its log.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().deliveries().list(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ListDeliveriesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**status:** `Optional<ListDeliveriesRequestStatus>` — Only deliveries with this status.
    
</dd>
</dl>

<dl>
<dd>

**eventId:** `Optional<String>` — Only the delivery of this event.
    
</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — 1-100, default 50.
    
</dd>
</dl>

<dl>
<dd>

**after:** `Optional<String>` — Cursor: the `id` of the last delivery of the previous page.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.deliveries.get(id, deliveryId) -> WebhookDelivery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One delivery of the endpoint, with every HTTP attempt and the payload as sent.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().deliveries().get(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
    GetDeliveriesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**deliveryId:** `String` — The delivery's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhookEndpoints.deliveries.retry(id, deliveryId) -> WebhookDelivery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Queues a finished delivery (`succeeded` or `failed`) for one more attempt, made within seconds, signed with the endpoint's current secret and sent to its current URL. A delivery that is still `pending` is returned unchanged: it is already scheduled for `next_attempt_at` (automatic retries stop after 8 attempts).
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.webhookEndpoints().deliveries().retry(
    "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
    RetryDeliveriesRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — The webhook endpoint's id.
    
</dd>
</dl>

<dl>
<dd>

**deliveryId:** `String` — The delivery's id.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

