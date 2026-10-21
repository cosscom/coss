# Reference
## Environment
<details><summary><code>client.Environment.<a href="/src/Coss/Environment/EnvironmentClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;Environment&gt;</code></summary>
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

```csharp
await client.Environment.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## ApiKey
<details><summary><code>client.ApiKey.<a href="/src/Coss/ApiKey/ApiKeyClient.cs">RevokeAsync</a>() -> WithRawResponseTask&lt;DeletedApiKey&gt;</code></summary>
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

```csharp
await client.ApiKey.RevokeAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email
<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">ListAsync</a>(ListEmailRequest { ... }) -> WithRawResponseTask&lt;EmailSummaryList&gt;</code></summary>
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

```csharp
await client.Email.ListAsync(new ListEmailRequest { To = "user@example.com" });
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

**request:** `ListEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">SendAsync</a>(SendEmailBody { ... }) -> WithRawResponseTask&lt;EmailMessage&gt;</code></summary>
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

```csharp
await client.Email.SendAsync(
    new SendEmailBody
    {
        IdempotencyKey = "welcome-user-123",
        Body = new SendEmailRequest
        {
            From = "Acme <onboarding@acme.com>",
            To = "user@example.com",
            Subject = "Welcome to Acme",
            Html = "<p>Thanks for signing up!</p>",
            Tags = new List<SendEmailRequestTagsItem>()
            {
                new SendEmailRequestTagsItem { Name = "template", Value = "welcome" },
            },
            Category = "onboarding",
        },
    }
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

**request:** `SendEmailBody` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">SendBatchAsync</a>(SendEmailBatchRequest { ... }) -> WithRawResponseTask&lt;EmailBatch&gt;</code></summary>
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

```csharp
await client.Email.SendBatchAsync(
    new SendEmailBatchRequest
    {
        IdempotencyKey = "welcome-user-123",
        Emails = new List<SendEmailRequest>()
        {
            new SendEmailRequest
            {
                From = "Acme <notifications@acme.com>",
                To = "ada@example.com",
                Subject = "Your weekly summary",
                Html = "<p>Hi Ada, here is your week.</p>",
                Category = "digest",
            },
            new SendEmailRequest
            {
                From = "Acme <notifications@acme.com>",
                To = "grace@example.com",
                Subject = "Your weekly summary",
                Html = "<p>Hi Grace, here is your week.</p>",
                Category = "digest",
            },
        },
    }
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

**request:** `SendEmailBatchRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">GetBatchAsync</a>(GetBatchEmailRequest { ... }) -> WithRawResponseTask&lt;EmailBatch&gt;</code></summary>
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

```csharp
await client.Email.GetBatchAsync(
    new GetBatchEmailRequest { Id = "batch_01k8d0n6x5f3w2e1r9t7y4u6i8" }
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

**request:** `GetBatchEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">GetAsync</a>(GetEmailRequest { ... }) -> WithRawResponseTask&lt;EmailMessage&gt;</code></summary>
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

```csharp
await client.Email.GetAsync(new GetEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `GetEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">CancelAsync</a>(CancelEmailRequest { ... }) -> WithRawResponseTask&lt;EmailMessage&gt;</code></summary>
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

```csharp
await client.Email.CancelAsync(new CancelEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `CancelEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">RescheduleAsync</a>(RescheduleEmailRequest { ... }) -> WithRawResponseTask&lt;EmailMessage&gt;</code></summary>
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

```csharp
await client.Email.RescheduleAsync(
    new RescheduleEmailRequest
    {
        Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
        ScheduledAt = new DateTime(2026, 10, 12, 09, 00, 00, 000),
    }
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

**request:** `RescheduleEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">ListEventsAsync</a>(ListEventsEmailRequest { ... }) -> WithRawResponseTask&lt;EmailEventList&gt;</code></summary>
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

```csharp
await client.Email.ListEventsAsync(
    new ListEventsEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListEventsEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.<a href="/src/Coss/Email/EmailClient.cs">ListLinksAsync</a>(ListLinksEmailRequest { ... }) -> WithRawResponseTask&lt;EmailLinkList&gt;</code></summary>
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

```csharp
await client.Email.ListLinksAsync(
    new ListLinksEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListLinksEmailRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains
<details><summary><code>client.Domains.<a href="/src/Coss/Domains/DomainsClient.cs">ListAsync</a>() -> WithRawResponseTask&lt;DomainList&gt;</code></summary>
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

```csharp
await client.Domains.ListAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.<a href="/src/Coss/Domains/DomainsClient.cs">CreateAsync</a>(CreateDomainRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.CreateAsync(new CreateDomainRequest { Name = "acme.com" });
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

**request:** `CreateDomainRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.<a href="/src/Coss/Domains/DomainsClient.cs">GetAsync</a>(GetDomainsRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.GetAsync(new GetDomainsRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `GetDomainsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.<a href="/src/Coss/Domains/DomainsClient.cs">DeleteAsync</a>(DeleteDomainsRequest { ... }) -> WithRawResponseTask&lt;DeletedDomain&gt;</code></summary>
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

```csharp
await client.Domains.DeleteAsync(
    new DeleteDomainsRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteDomainsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.<a href="/src/Coss/Domains/DomainsClient.cs">VerifyAsync</a>(VerifyDomainsRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.VerifyAsync(
    new VerifyDomainsRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `VerifyDomainsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Webhook endpoints
<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">ListAsync</a>() -> WithRawResponseTask&lt;WebhookEndpointList&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.ListAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">CreateAsync</a>(CreateWebhookEndpointRequest { ... }) -> WithRawResponseTask&lt;WebhookEndpointWithSecret&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.CreateAsync(
    new CreateWebhookEndpointRequest
    {
        Url = "https://example.com/webhooks/coss",
        Description = "Production receiver",
        EventTypes = new List<CreateWebhookEndpointRequestEventTypesItem>()
        {
            CreateWebhookEndpointRequestEventTypesItem.EmailSent,
            CreateWebhookEndpointRequestEventTypesItem.EmailDelivered,
        },
    }
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

**request:** `CreateWebhookEndpointRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">GetAsync</a>(GetWebhookEndpointsRequest { ... }) -> WithRawResponseTask&lt;WebhookEndpoint&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.GetAsync(
    new GetWebhookEndpointsRequest { Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetWebhookEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">DeleteAsync</a>(DeleteWebhookEndpointsRequest { ... }) -> WithRawResponseTask&lt;DeletedWebhookEndpoint&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.DeleteAsync(
    new DeleteWebhookEndpointsRequest { Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteWebhookEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">UpdateAsync</a>(UpdateWebhookEndpointRequest { ... }) -> WithRawResponseTask&lt;WebhookEndpoint&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.UpdateAsync(
    new UpdateWebhookEndpointRequest { Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz", Enabled = false }
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

**request:** `UpdateWebhookEndpointRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">RollSecretAsync</a>(RollWebhookEndpointSecretRequest { ... }) -> WithRawResponseTask&lt;WebhookEndpointWithSecret&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.RollSecretAsync(
    new RollWebhookEndpointSecretRequest
    {
        Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        PreviousSecretExpiresIn = 3600,
    }
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

**request:** `RollWebhookEndpointSecretRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.<a href="/src/Coss/WebhookEndpoints/WebhookEndpointsClient.cs">RecoverAsync</a>(RecoverWebhookEndpointRequest { ... }) -> WithRawResponseTask&lt;WebhookEndpointRecovery&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.RecoverAsync(
    new RecoverWebhookEndpointRequest
    {
        Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Since = new DateTime(2026, 01, 15, 09, 00, 00, 000),
    }
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

**request:** `RecoverWebhookEndpointRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## WebhookListeners
<details><summary><code>client.WebhookListeners.<a href="/src/Coss/WebhookListeners/WebhookListenersClient.cs">CreateAsync</a>(CreateWebhookListenerRequest { ... }) -> WithRawResponseTask&lt;WebhookListener&gt;</code></summary>
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

```csharp
await client.WebhookListeners.CreateAsync(
    new CreateWebhookListenerRequest
    {
        EventTypes = new List<CreateWebhookListenerRequestEventTypesItem>()
        {
            CreateWebhookListenerRequestEventTypesItem.EmailSent,
            CreateWebhookListenerRequestEventTypesItem.EmailDelivered,
        },
        Description = "localhost:3000/webhooks",
    }
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

**request:** `CreateWebhookListenerRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookListeners.<a href="/src/Coss/WebhookListeners/WebhookListenersClient.cs">PollAsync</a>(PollWebhookListenerRequest { ... }) -> WithRawResponseTask&lt;WebhookListenerPoll&gt;</code></summary>
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

```csharp
await client.WebhookListeners.PollAsync(
    new PollWebhookListenerRequest
    {
        Id = "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Acks = new List<WebhookListenerAck>()
        {
            new WebhookListenerAck
            {
                DeliveryId = "whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
                AckToken = "mfz3k2a8",
                StatusCode = 200,
                DurationMs = 12,
                Error = null,
            },
        },
        WaitMs = 20000,
    }
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

**request:** `PollWebhookListenerRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookListeners.<a href="/src/Coss/WebhookListeners/WebhookListenersClient.cs">DeleteAsync</a>(DeleteWebhookListenersRequest { ... }) -> WithRawResponseTask&lt;DeletedWebhookListener&gt;</code></summary>
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

```csharp
await client.WebhookListeners.DeleteAsync(
    new DeleteWebhookListenersRequest { Id = "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteWebhookListenersRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Reputation
<details><summary><code>client.Reputation.<a href="/src/Coss/Reputation/ReputationClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;Reputation&gt;</code></summary>
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

```csharp
await client.Reputation.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Logs
<details><summary><code>client.Logs.<a href="/src/Coss/Logs/LogsClient.cs">ListAsync</a>(ListLogsRequest { ... }) -> WithRawResponseTask&lt;LogList&gt;</code></summary>
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

```csharp
await client.Logs.ListAsync(new ListLogsRequest());
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

**request:** `ListLogsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Logs.<a href="/src/Coss/Logs/LogsClient.cs">GetAsync</a>(GetLogsRequest { ... }) -> WithRawResponseTask&lt;Log&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Logs.GetAsync(new GetLogsRequest { Id = "log_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `GetLogsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## AuditEvents
<details><summary><code>client.AuditEvents.<a href="/src/Coss/AuditEvents/AuditEventsClient.cs">ListAsync</a>(ListAuditEventsRequest { ... }) -> WithRawResponseTask&lt;AuditEventList&gt;</code></summary>
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

```csharp
await client.AuditEvents.ListAsync(new ListAuditEventsRequest());
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

**request:** `ListAuditEventsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.AuditEvents.<a href="/src/Coss/AuditEvents/AuditEventsClient.cs">GetAsync</a>(GetAuditEventsRequest { ... }) -> WithRawResponseTask&lt;AuditEvent&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.AuditEvents.GetAsync(
    new GetAuditEventsRequest { Id = "oaudit_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetAuditEventsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Billing
<details><summary><code>client.Billing.<a href="/src/Coss/Billing/BillingClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;BillingOverview&gt;</code></summary>
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

```csharp
await client.Billing.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Billing.<a href="/src/Coss/Billing/BillingClient.cs">UsageAsync</a>(UsageBillingRequest { ... }) -> WithRawResponseTask&lt;UsageList&gt;</code></summary>
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

```csharp
await client.Billing.UsageAsync(new UsageBillingRequest());
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

**request:** `UsageBillingRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Log drains
<details><summary><code>client.LogDrains.<a href="/src/Coss/LogDrains/LogDrainsClient.cs">ListAsync</a>() -> WithRawResponseTask&lt;LogDrainList&gt;</code></summary>
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

```csharp
await client.LogDrains.ListAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.LogDrains.<a href="/src/Coss/LogDrains/LogDrainsClient.cs">CreateAsync</a>(CreateLogDrainRequest { ... }) -> WithRawResponseTask&lt;LogDrainWithSecret&gt;</code></summary>
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

```csharp
await client.LogDrains.CreateAsync(
    new CreateLogDrainRequest
    {
        Url = "https://logs.example.com/coss",
        Description = "Production logs",
        Sources = new List<LogDrainSource>() { LogDrainSource.Api, LogDrainSource.Email },
    }
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

**request:** `CreateLogDrainRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.LogDrains.<a href="/src/Coss/LogDrains/LogDrainsClient.cs">GetAsync</a>(GetLogDrainsRequest { ... }) -> WithRawResponseTask&lt;LogDrain&gt;</code></summary>
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

```csharp
await client.LogDrains.GetAsync(
    new GetLogDrainsRequest { Id = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetLogDrainsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.LogDrains.<a href="/src/Coss/LogDrains/LogDrainsClient.cs">DeleteAsync</a>(DeleteLogDrainsRequest { ... }) -> WithRawResponseTask&lt;DeletedLogDrain&gt;</code></summary>
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

```csharp
await client.LogDrains.DeleteAsync(
    new DeleteLogDrainsRequest { Id = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteLogDrainsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.LogDrains.<a href="/src/Coss/LogDrains/LogDrainsClient.cs">UpdateAsync</a>(UpdateLogDrainRequest { ... }) -> WithRawResponseTask&lt;LogDrain&gt;</code></summary>
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

```csharp
await client.LogDrains.UpdateAsync(
    new UpdateLogDrainRequest { Id = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz", Enabled = false }
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

**request:** `UpdateLogDrainRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk
<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">AssessAsync</a>(CreateRiskAssessmentRequest { ... }) -> WithRawResponseTask&lt;RiskAssessment&gt;</code></summary>
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

```csharp
await client.Risk.AssessAsync(
    new CreateRiskAssessmentRequest
    {
        IdempotencyKey = "welcome-user-123",
        Event = RiskEvent.Signup,
        User = new CreateRiskAssessmentRequestUser { Email = "ada@gmail.con" },
        Ip = "203.0.113.7",
        UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15",
    }
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

**request:** `CreateRiskAssessmentRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">FeedbackAsync</a>(CreateRiskFeedbackRequest { ... }) -> WithRawResponseTask&lt;RiskAssessment&gt;</code></summary>
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

```csharp
await client.Risk.FeedbackAsync(
    new CreateRiskFeedbackRequest
    {
        Id = "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Outcome = RiskOutcome.Fraud,
    }
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

**request:** `CreateRiskFeedbackRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">CalibrationAsync</a>() -> WithRawResponseTask&lt;RiskCalibration&gt;</code></summary>
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

```csharp
await client.Risk.CalibrationAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">CheckEmailAsync</a>(RiskEmailCheckRequest { ... }) -> WithRawResponseTask&lt;RiskEmailCheck&gt;</code></summary>
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

```csharp
await client.Risk.CheckEmailAsync(new RiskEmailCheckRequest { Email = "ada@gnail.com" });
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

**request:** `RiskEmailCheckRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">CheckIpAsync</a>(RiskIpCheckRequest { ... }) -> WithRawResponseTask&lt;RiskIpCheck&gt;</code></summary>
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

```csharp
await client.Risk.CheckIpAsync(new RiskIpCheckRequest { Ip = "185.220.101.1" });
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

**request:** `RiskIpCheckRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">ClassifyAsync</a>(RiskContentClassifyRequest { ... }) -> WithRawResponseTask&lt;RiskContentClassification&gt;</code></summary>
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

```csharp
await client.Risk.ClassifyAsync(
    new RiskContentClassifyRequest
    {
        Text = "Earn $5,000 a week from home! DM me on Telegram: t.me/fast-cash",
    }
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

**request:** `RiskContentClassifyRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.<a href="/src/Coss/Risk/RiskClient.cs">LimitAsync</a>(CheckRiskLimitRequest { ... }) -> WithRawResponseTask&lt;RiskLimit&gt;</code></summary>
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

```csharp
await client.Risk.LimitAsync(
    new CheckRiskLimitRequest
    {
        IdempotencyKey = "welcome-user-123",
        Bucket = "password_reset",
        Key = "ada@example.com",
    }
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

**request:** `CheckRiskLimitRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Billing Invoices
<details><summary><code>client.Billing.Invoices.<a href="/src/Coss/Billing/Invoices/InvoicesClient.cs">ListAsync</a>(ListInvoicesRequest { ... }) -> WithRawResponseTask&lt;InvoiceList&gt;</code></summary>
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

```csharp
await client.Billing.Invoices.ListAsync(new ListInvoicesRequest());
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

**request:** `ListInvoicesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Billing.Invoices.<a href="/src/Coss/Billing/Invoices/InvoicesClient.cs">GetAsync</a>(GetInvoicesRequest { ... }) -> WithRawResponseTask&lt;Invoice&gt;</code></summary>
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

```csharp
await client.Billing.Invoices.GetAsync(
    new GetInvoicesRequest { Id = "inv_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetInvoicesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Billing Credits
<details><summary><code>client.Billing.Credits.<a href="/src/Coss/Billing/Credits/CreditsClient.cs">ListAsync</a>(ListCreditsRequest { ... }) -> WithRawResponseTask&lt;CreditList&gt;</code></summary>
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

```csharp
await client.Billing.Credits.ListAsync(new ListCreditsRequest());
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

**request:** `ListCreditsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Tracking
<details><summary><code>client.Domains.Tracking.<a href="/src/Coss/Domains/Tracking/TrackingClient.cs">CreateAsync</a>(CreateTrackingDomainRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.Tracking.CreateAsync(
    new CreateTrackingDomainRequest
    {
        Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Hostname = "links.acme.com",
    }
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

**request:** `CreateTrackingDomainRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.Tracking.<a href="/src/Coss/Domains/Tracking/TrackingClient.cs">DeleteAsync</a>(DeleteTrackingRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.Tracking.DeleteAsync(
    new DeleteTrackingRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteTrackingRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Receiving
<details><summary><code>client.Domains.Receiving.<a href="/src/Coss/Domains/Receiving/ReceivingClient.cs">CreateAsync</a>(CreateReceivingDomainRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.Receiving.CreateAsync(
    new CreateReceivingDomainRequest
    {
        Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Hostname = "inbound.acme.com",
    }
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

**request:** `CreateReceivingDomainRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.Receiving.<a href="/src/Coss/Domains/Receiving/ReceivingClient.cs">DeleteAsync</a>(DeleteReceivingRequest { ... }) -> WithRawResponseTask&lt;Domain&gt;</code></summary>
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

```csharp
await client.Domains.Receiving.DeleteAsync(
    new DeleteReceivingRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteReceivingRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Dmarc
<details><summary><code>client.Domains.Dmarc.<a href="/src/Coss/Domains/Dmarc/DmarcClient.cs">GetAsync</a>(GetDmarcRequest { ... }) -> WithRawResponseTask&lt;DomainDmarc&gt;</code></summary>
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

```csharp
await client.Domains.Dmarc.GetAsync(new GetDmarcRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `GetDmarcRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Domains Dmarc Reports
<details><summary><code>client.Domains.Dmarc.Reports.<a href="/src/Coss/Domains/Dmarc/Reports/ReportsClient.cs">ListAsync</a>(ListReportsRequest { ... }) -> WithRawResponseTask&lt;DmarcReportList&gt;</code></summary>
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

```csharp
await client.Domains.Dmarc.Reports.ListAsync(
    new ListReportsRequest { Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListReportsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Domains.Dmarc.Reports.<a href="/src/Coss/Domains/Dmarc/Reports/ReportsClient.cs">GetAsync</a>(GetReportsRequest { ... }) -> WithRawResponseTask&lt;DmarcReport&gt;</code></summary>
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

```csharp
await client.Domains.Dmarc.Reports.GetAsync(
    new GetReportsRequest
    {
        Id = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz",
        ReportId = "dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `GetReportsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Templates
<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">ListAsync</a>(ListTemplatesRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateList&gt;</code></summary>
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

```csharp
await client.Email.Templates.ListAsync(new ListTemplatesRequest());
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

**request:** `ListTemplatesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">CreateAsync</a>(CreateEmailTemplateRequest { ... }) -> WithRawResponseTask&lt;EmailTemplate&gt;</code></summary>
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

```csharp
await client.Email.Templates.CreateAsync(
    new CreateEmailTemplateRequest
    {
        Name = "Welcome",
        Alias = "welcome",
        DefaultLocale = "en",
        Variables = new List<TemplateVariableInput>()
        {
            new TemplateVariableInput
            {
                Name = "first_name",
                Type = TemplateVariableInputType.String,
                Required = true,
            },
        },
        SampleVariables = new Dictionary<string, object?>() { { "first_name", "Ada" } },
        Contents = new List<TemplateContentInput>()
        {
            new TemplateContentInput
            {
                Locale = "en",
                Subject = "Welcome, {{first_name}}",
                Html = "<p>Hi {{first_name}}, thanks for signing up!</p>",
            },
            new TemplateContentInput
            {
                Locale = "de",
                Subject = "Willkommen, {{first_name}}",
                Html = "<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>",
            },
        },
    }
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

**request:** `CreateEmailTemplateRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">GetAsync</a>(GetTemplatesRequest { ... }) -> WithRawResponseTask&lt;EmailTemplate&gt;</code></summary>
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

```csharp
await client.Email.Templates.GetAsync(
    new GetTemplatesRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetTemplatesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">DeleteAsync</a>(DeleteTemplatesRequest { ... }) -> WithRawResponseTask&lt;DeletedEmailTemplate&gt;</code></summary>
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

```csharp
await client.Email.Templates.DeleteAsync(
    new DeleteTemplatesRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteTemplatesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">UpdateAsync</a>(UpdateEmailTemplateRequest { ... }) -> WithRawResponseTask&lt;EmailTemplate&gt;</code></summary>
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

```csharp
await client.Email.Templates.UpdateAsync(
    new UpdateEmailTemplateRequest
    {
        Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Name = "Welcome (new users)",
    }
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

**request:** `UpdateEmailTemplateRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">GetDraftAsync</a>(GetDraftTemplatesRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateVersion&gt;</code></summary>
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

```csharp
await client.Email.Templates.GetDraftAsync(
    new GetDraftTemplatesRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetDraftTemplatesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">UpdateDraftAsync</a>(UpdateEmailTemplateDraftRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateVersion&gt;</code></summary>
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

```csharp
await client.Email.Templates.UpdateDraftAsync(
    new UpdateEmailTemplateDraftRequest
    {
        Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Revision = 3,
        DefaultLocale = "en",
        Variables = new List<TemplateVariableInput>()
        {
            new TemplateVariableInput
            {
                Name = "first_name",
                Type = TemplateVariableInputType.String,
                Required = true,
            },
        },
        SampleVariables = new Dictionary<string, object?>() { { "first_name", "Ada" } },
        Contents = new List<TemplateContentInput>()
        {
            new TemplateContentInput
            {
                Locale = "en",
                Subject = "Welcome, {{first_name}}",
                Html = "<p>Hi {{first_name}}, thanks for signing up!</p>",
            },
            new TemplateContentInput
            {
                Locale = "de",
                Subject = "Willkommen, {{first_name}}",
                Html = "<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>",
            },
        },
    }
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

**request:** `UpdateEmailTemplateDraftRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.<a href="/src/Coss/Email/Templates/TemplatesClient.cs">PublishAsync</a>(PublishEmailTemplateRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateVersion&gt;</code></summary>
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

```csharp
await client.Email.Templates.PublishAsync(
    new PublishEmailTemplateRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz", Revision = 3 }
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

**request:** `PublishEmailTemplateRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email DedicatedIps
<details><summary><code>client.Email.DedicatedIps.<a href="/src/Coss/Email/DedicatedIps/DedicatedIpsClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;DedicatedIpPool&gt;</code></summary>
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

```csharp
await client.Email.DedicatedIps.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Suppressions
<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">ListAsync</a>(ListSuppressionsRequest { ... }) -> WithRawResponseTask&lt;SuppressionList&gt;</code></summary>
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

```csharp
await client.Email.Suppressions.ListAsync(new ListSuppressionsRequest());
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

**request:** `ListSuppressionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">AddAsync</a>(CreateSuppressionRequest { ... }) -> WithRawResponseTask&lt;Suppression&gt;</code></summary>
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

```csharp
await client.Email.Suppressions.AddAsync(
    new CreateSuppressionRequest { Address = "user@example.com", Scope = "marketing" }
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

**request:** `CreateSuppressionRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">CheckAsync</a>(CheckSuppressionsRequest { ... }) -> WithRawResponseTask&lt;SuppressionCheck&gt;</code></summary>
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

```csharp
await client.Email.Suppressions.CheckAsync(
    new CheckSuppressionsRequest { Address = "user@example.com" }
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

**request:** `CheckSuppressionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">ImportAsync</a>(ImportSuppressionsRequest { ... }) -> WithRawResponseTask&lt;SuppressionImport&gt;</code></summary>
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

```csharp
await client.Email.Suppressions.ImportAsync(
    new ImportSuppressionsRequest
    {
        Suppressions = new List<ImportSuppressionsRequestSuppressionsItem>()
        {
            new ImportSuppressionsRequestSuppressionsItem { Address = "user@example.com" },
            new ImportSuppressionsRequestSuppressionsItem
            {
                Address = "other@example.com",
                Scope = "marketing",
            },
        },
    }
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

**request:** `ImportSuppressionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">ExportAsync</a>(ExportSuppressionsRequest { ... }) -> WithRawResponseTask&lt;string&gt;</code></summary>
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

```csharp
await client.Email.Suppressions.ExportAsync(new ExportSuppressionsRequest());
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

**request:** `ExportSuppressionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">GetAsync</a>(GetSuppressionsRequest { ... }) -> WithRawResponseTask&lt;Suppression&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Suppressions.GetAsync(
    new GetSuppressionsRequest { Id = "sup_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetSuppressionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Suppressions.<a href="/src/Coss/Email/Suppressions/SuppressionsClient.cs">RemoveAsync</a>(RemoveSuppressionsRequest { ... }) -> WithRawResponseTask&lt;DeletedSuppression&gt;</code></summary>
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

```csharp
await client.Email.Suppressions.RemoveAsync(
    new RemoveSuppressionsRequest { Id = "sup_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveSuppressionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Tracking
<details><summary><code>client.Email.Tracking.<a href="/src/Coss/Email/Tracking/TrackingClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;TrackingSettings&gt;</code></summary>
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

```csharp
await client.Email.Tracking.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Tracking.<a href="/src/Coss/Email/Tracking/TrackingClient.cs">RemoveDefaultAsync</a>() -> WithRawResponseTask&lt;DeletedTrackingRule&gt;</code></summary>
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

```csharp
await client.Email.Tracking.RemoveDefaultAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Tracking.<a href="/src/Coss/Email/Tracking/TrackingClient.cs">UpdateDefaultAsync</a>(UpdateTrackingRuleRequest { ... }) -> WithRawResponseTask&lt;TrackingRule&gt;</code></summary>
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

```csharp
await client.Email.Tracking.UpdateDefaultAsync(
    new UpdateTrackingRuleRequest { Opens = false, Clicks = false }
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

<details><summary><code>client.Email.Tracking.<a href="/src/Coss/Email/Tracking/TrackingClient.cs">RemoveCategoryAsync</a>(RemoveCategoryTrackingRequest { ... }) -> WithRawResponseTask&lt;DeletedTrackingRule&gt;</code></summary>
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

```csharp
await client.Email.Tracking.RemoveCategoryAsync(
    new RemoveCategoryTrackingRequest { Category = "password-reset" }
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

**request:** `RemoveCategoryTrackingRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Tracking.<a href="/src/Coss/Email/Tracking/TrackingClient.cs">UpdateCategoryAsync</a>(UpdateCategoryTrackingRequest { ... }) -> WithRawResponseTask&lt;TrackingRule&gt;</code></summary>
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

```csharp
await client.Email.Tracking.UpdateCategoryAsync(
    new UpdateCategoryTrackingRequest
    {
        Category = "password-reset",
        Body = new UpdateTrackingRuleRequest { Opens = false, Clicks = false },
    }
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

**request:** `UpdateCategoryTrackingRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Contacts
<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">ListAsync</a>(ListContactsRequest { ... }) -> WithRawResponseTask&lt;ContactList&gt;</code></summary>
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

```csharp
await client.Email.Contacts.ListAsync(new ListContactsRequest());
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

**request:** `ListContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">UpsertAsync</a>(UpsertContactRequest { ... }) -> WithRawResponseTask&lt;Contact&gt;</code></summary>
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

```csharp
await client.Email.Contacts.UpsertAsync(
    new UpsertContactRequest
    {
        Email = "ada@example.com",
        FirstName = "Ada",
        Properties = new Dictionary<string, OneOf<string, double, bool>?>() { { "plan", "pro" } },
        Topics = new List<UpsertContactRequestTopicsItem>()
        {
            new UpsertContactRequestTopicsItem
            {
                Topic = "newsletter",
                Status = UpsertContactRequestTopicsItemStatus.OptedIn,
            },
        },
    }
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

**request:** `UpsertContactRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">ResendConfirmationAsync</a>(ResendConfirmationContactsRequest { ... }) -> WithRawResponseTask&lt;ContactConfirmation&gt;</code></summary>
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

```csharp
await client.Email.Contacts.ResendConfirmationAsync(
    new ResendConfirmationContactsRequest { Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ResendConfirmationContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">CreatePreferenceLinksAsync</a>(CreatePreferenceLinksRequest { ... }) -> WithRawResponseTask&lt;PreferenceLinks&gt;</code></summary>
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

```csharp
await client.Email.Contacts.CreatePreferenceLinksAsync(
    new CreatePreferenceLinksRequest
    {
        Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Topic = "newsletter",
    }
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

**request:** `CreatePreferenceLinksRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">ImportAsync</a>(ImportContactsRequest { ... }) -> WithRawResponseTask&lt;ContactImport&gt;</code></summary>
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

```csharp
await client.Email.Contacts.ImportAsync(
    new ImportContactsRequest
    {
        Contacts = new List<ImportContactsRequestContactsItem>()
        {
            new ImportContactsRequestContactsItem
            {
                Email = "ada@example.com",
                FirstName = "Ada",
                Properties = new Dictionary<string, OneOf<string, double, bool>?>()
                {
                    { "plan", "pro" },
                },
            },
            new ImportContactsRequestContactsItem
            {
                Email = "grace@example.com",
                Status = "unsubscribed",
            },
        },
    }
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

**request:** `ImportContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">ExportAsync</a>(ExportContactsRequest { ... }) -> WithRawResponseTask&lt;string&gt;</code></summary>
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

```csharp
await client.Email.Contacts.ExportAsync(new ExportContactsRequest());
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

**request:** `ExportContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">GetAsync</a>(GetContactsRequest { ... }) -> WithRawResponseTask&lt;Contact&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Contacts.GetAsync(
    new GetContactsRequest { Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">RemoveAsync</a>(RemoveContactsRequest { ... }) -> WithRawResponseTask&lt;DeletedContact&gt;</code></summary>
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

```csharp
await client.Email.Contacts.RemoveAsync(
    new RemoveContactsRequest { Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">UpdateAsync</a>(UpdateContactRequest { ... }) -> WithRawResponseTask&lt;Contact&gt;</code></summary>
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

```csharp
await client.Email.Contacts.UpdateAsync(
    new UpdateContactRequest
    {
        Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
        LastName = "Byron",
        Properties = new Dictionary<string, OneOf<string, double, bool>?>() { { "seats", null } },
    }
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

**request:** `UpdateContactRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">GetTopicsAsync</a>(GetTopicsContactsRequest { ... }) -> WithRawResponseTask&lt;ContactTopics&gt;</code></summary>
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

```csharp
await client.Email.Contacts.GetTopicsAsync(
    new GetTopicsContactsRequest { Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetTopicsContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.<a href="/src/Coss/Email/Contacts/ContactsClient.cs">UpdateTopicsAsync</a>(UpdateContactTopicsRequest { ... }) -> WithRawResponseTask&lt;ContactTopics&gt;</code></summary>
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

```csharp
await client.Email.Contacts.UpdateTopicsAsync(
    new UpdateContactTopicsRequest
    {
        Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Topics = new List<UpdateContactTopicsRequestTopicsItem>()
        {
            new UpdateContactTopicsRequestTopicsItem
            {
                Topic = "product",
                Status = UpdateContactTopicsRequestTopicsItemStatus.OptedOut,
            },
        },
    }
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

**request:** `UpdateContactTopicsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Broadcasts
<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">ListAsync</a>(ListBroadcastsRequest { ... }) -> WithRawResponseTask&lt;BroadcastList&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.ListAsync(new ListBroadcastsRequest());
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

**request:** `ListBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">CreateAsync</a>(CreateBroadcastRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.CreateAsync(
    new CreateBroadcastRequest
    {
        IdempotencyKey = "welcome-user-123",
        Name = "October newsletter",
        SegmentId = "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Topic = "newsletter",
        From = "Acme <news@acme.com>",
        Subject = "What's new, {{{contact.first_name|there}}}",
        Html =
            "<p>Hi {{{contact.first_name|there}}},</p><p>…</p><p><a href=\"{{{unsubscribe_url}}}\">Unsubscribe</a></p>",
        ScheduledAt = new DateTime(2026, 10, 20, 09, 00, 00, 000),
    }
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

**request:** `CreateBroadcastRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">GetAsync</a>(GetBroadcastsRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Broadcasts.GetAsync(
    new GetBroadcastsRequest { Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">RemoveAsync</a>(RemoveBroadcastsRequest { ... }) -> WithRawResponseTask&lt;DeletedBroadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.RemoveAsync(
    new RemoveBroadcastsRequest { Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">UpdateAsync</a>(UpdateBroadcastRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.UpdateAsync(
    new UpdateBroadcastRequest
    {
        Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Subject = "Our October news",
    }
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

**request:** `UpdateBroadcastRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">SendAsync</a>(SendBroadcastRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.SendAsync(
    new SendBroadcastRequest
    {
        Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
        ScheduledAt = new DateTime(2026, 10, 20, 09, 00, 00, 000),
    }
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

**request:** `SendBroadcastRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">CancelAsync</a>(CancelBroadcastsRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.CancelAsync(
    new CancelBroadcastsRequest { Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `CancelBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">PauseAsync</a>(PauseBroadcastsRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.PauseAsync(
    new PauseBroadcastsRequest { Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `PauseBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">ResumeAsync</a>(ResumeBroadcastsRequest { ... }) -> WithRawResponseTask&lt;Broadcast&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.ResumeAsync(
    new ResumeBroadcastsRequest { Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ResumeBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">TestAsync</a>(TestBroadcastRequest { ... }) -> WithRawResponseTask&lt;BroadcastTest&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.TestAsync(
    new TestBroadcastRequest
    {
        Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
        To = new List<string>() { "me@acme.com" },
    }
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

**request:** `TestBroadcastRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Broadcasts.<a href="/src/Coss/Email/Broadcasts/BroadcastsClient.cs">ListEmailsAsync</a>(ListEmailsBroadcastsRequest { ... }) -> WithRawResponseTask&lt;BroadcastEmailList&gt;</code></summary>
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

```csharp
await client.Email.Broadcasts.ListEmailsAsync(
    new ListEmailsBroadcastsRequest { Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListEmailsBroadcastsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Audiences
<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">ListAsync</a>(ListAudiencesRequest { ... }) -> WithRawResponseTask&lt;AudienceList&gt;</code></summary>
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

```csharp
await client.Email.Audiences.ListAsync(new ListAudiencesRequest());
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

**request:** `ListAudiencesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">CreateAsync</a>(CreateAudienceRequest { ... }) -> WithRawResponseTask&lt;Audience&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Audiences.CreateAsync(new CreateAudienceRequest { Name = "Beta testers" });
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

**request:** `CreateAudienceRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">GetAsync</a>(GetAudiencesRequest { ... }) -> WithRawResponseTask&lt;Audience&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Audiences.GetAsync(
    new GetAudiencesRequest { Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetAudiencesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">RemoveAsync</a>(RemoveAudiencesRequest { ... }) -> WithRawResponseTask&lt;DeletedAudience&gt;</code></summary>
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

```csharp
await client.Email.Audiences.RemoveAsync(
    new RemoveAudiencesRequest { Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveAudiencesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">UpdateAsync</a>(UpdateAudienceRequest { ... }) -> WithRawResponseTask&lt;Audience&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Audiences.UpdateAsync(
    new UpdateAudienceRequest { Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz", Name = "Early access" }
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

**request:** `UpdateAudienceRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">ListContactsAsync</a>(ListContactsAudiencesRequest { ... }) -> WithRawResponseTask&lt;ContactList&gt;</code></summary>
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

```csharp
await client.Email.Audiences.ListContactsAsync(
    new ListContactsAudiencesRequest { Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListContactsAudiencesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">AddContactsAsync</a>(AddAudienceContactsRequest { ... }) -> WithRawResponseTask&lt;AudienceContactsAdded&gt;</code></summary>
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

```csharp
await client.Email.Audiences.AddContactsAsync(
    new AddAudienceContactsRequest
    {
        Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Contacts = new List<string>() { "contact_01k7c8m4q2f3e9v6t5r1n0p8yz", "grace@example.com" },
    }
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

**request:** `AddAudienceContactsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Audiences.<a href="/src/Coss/Email/Audiences/AudiencesClient.cs">RemoveContactAsync</a>(RemoveContactAudiencesRequest { ... }) -> WithRawResponseTask&lt;RemoveContactAudiencesResponse&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Audiences.RemoveContactAsync(
    new RemoveContactAudiencesRequest
    {
        Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
        ContactId = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `RemoveContactAudiencesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Segments
<details><summary><code>client.Email.Segments.<a href="/src/Coss/Email/Segments/SegmentsClient.cs">ListAsync</a>(ListSegmentsRequest { ... }) -> WithRawResponseTask&lt;SegmentList&gt;</code></summary>
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

```csharp
await client.Email.Segments.ListAsync(new ListSegmentsRequest());
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

**request:** `ListSegmentsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Segments.<a href="/src/Coss/Email/Segments/SegmentsClient.cs">CreateAsync</a>(CreateSegmentRequest { ... }) -> WithRawResponseTask&lt;Segment&gt;</code></summary>
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

```csharp
await client.Email.Segments.CreateAsync(
    new CreateSegmentRequest
    {
        Name = "Pro customers",
        Filter = new SegmentFilter
        {
            Version = 1,
            Match = SegmentFilterMatch.All,
            Conditions = new List<
                OneOf<
                    SegmentFilterConditionsItemKey,
                    SegmentFilterConditionsItemOne,
                    SegmentFilterConditionsItemAudienceId,
                    SegmentFilterConditionsItemTopic,
                    SegmentFilterConditionsItemField,
                    SegmentFilterConditionsItemConditions
                >
            >()
            {
                new SegmentFilterConditionsItemKey
                {
                    Field = SegmentFilterConditionsItemKeyField.Property,
                    Key = "plan",
                    Op = SegmentFilterConditionsItemKeyOp.Eq,
                    Value = "pro",
                },
                new SegmentFilterConditionsItemConditions
                {
                    Match = SegmentFilterConditionsItemConditionsMatch.Any,
                    Conditions = new List<SegmentFilterConditionsItemConditionsConditionsItem>()
                    {
                        new SegmentFilterConditionsItemConditionsConditionsItem(
                            new Coss.SegmentFilterConditionsItemConditionsConditionsItem.Email(
                                new SegmentFilterConditionsItemConditionsConditionsItemEmail
                                {
                                    Op =
                                        SegmentFilterConditionsItemConditionsConditionsItemEmailOp.EndsWith,
                                    Value = "@acme.com",
                                }
                            )
                        ),
                        new SegmentFilterConditionsItemConditionsConditionsItem(
                            new SegmentFilterConditionsItemConditionsConditionsItem.Audience(
                                new SegmentFilterConditionsItemConditionsConditionsItemAudience
                                {
                                    Op =
                                        SegmentFilterConditionsItemConditionsConditionsItemAudienceOp.In,
                                    AudienceId = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
                                }
                            )
                        ),
                    },
                },
            },
        },
    }
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

**request:** `CreateSegmentRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Segments.<a href="/src/Coss/Email/Segments/SegmentsClient.cs">GetAsync</a>(GetSegmentsRequest { ... }) -> WithRawResponseTask&lt;Segment&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Segments.GetAsync(
    new GetSegmentsRequest { Id = "seg_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetSegmentsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Segments.<a href="/src/Coss/Email/Segments/SegmentsClient.cs">RemoveAsync</a>(RemoveSegmentsRequest { ... }) -> WithRawResponseTask&lt;DeletedSegment&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Segments.RemoveAsync(
    new RemoveSegmentsRequest { Id = "seg_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveSegmentsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Segments.<a href="/src/Coss/Email/Segments/SegmentsClient.cs">UpdateAsync</a>(UpdateSegmentRequest { ... }) -> WithRawResponseTask&lt;Segment&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Segments.UpdateAsync(
    new UpdateSegmentRequest
    {
        Id = "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Name = "Pro and Scale customers",
    }
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

**request:** `UpdateSegmentRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Segments.<a href="/src/Coss/Email/Segments/SegmentsClient.cs">ListContactsAsync</a>(ListContactsSegmentsRequest { ... }) -> WithRawResponseTask&lt;ContactList&gt;</code></summary>
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

```csharp
await client.Email.Segments.ListContactsAsync(
    new ListContactsSegmentsRequest { Id = "seg_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListContactsSegmentsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Topics
<details><summary><code>client.Email.Topics.<a href="/src/Coss/Email/Topics/TopicsClient.cs">ListAsync</a>(ListTopicsRequest { ... }) -> WithRawResponseTask&lt;TopicList&gt;</code></summary>
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

```csharp
await client.Email.Topics.ListAsync(new ListTopicsRequest());
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

**request:** `ListTopicsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Topics.<a href="/src/Coss/Email/Topics/TopicsClient.cs">CreateAsync</a>(CreateTopicRequest { ... }) -> WithRawResponseTask&lt;Topic&gt;</code></summary>
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

```csharp
await client.Email.Topics.CreateAsync(
    new CreateTopicRequest
    {
        Key = "newsletter",
        Name = "Newsletter",
        DefaultSubscription = CreateTopicRequestDefaultSubscription.OptIn,
    }
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

**request:** `CreateTopicRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Topics.<a href="/src/Coss/Email/Topics/TopicsClient.cs">GetAsync</a>(GetTopicsRequest { ... }) -> WithRawResponseTask&lt;Topic&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Topics.GetAsync(
    new GetTopicsRequest { Id = "topic_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetTopicsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Topics.<a href="/src/Coss/Email/Topics/TopicsClient.cs">RemoveAsync</a>(RemoveTopicsRequest { ... }) -> WithRawResponseTask&lt;DeletedTopic&gt;</code></summary>
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

```csharp
await client.Email.Topics.RemoveAsync(
    new RemoveTopicsRequest { Id = "topic_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveTopicsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Topics.<a href="/src/Coss/Email/Topics/TopicsClient.cs">UpdateAsync</a>(UpdateTopicRequest { ... }) -> WithRawResponseTask&lt;Topic&gt;</code></summary>
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

```csharp
await client.Email.Topics.UpdateAsync(
    new UpdateTopicRequest
    {
        Id = "topic_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Visibility = UpdateTopicRequestVisibility.Private,
    }
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

**request:** `UpdateTopicRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email MarketingSettings
<details><summary><code>client.Email.MarketingSettings.<a href="/src/Coss/Email/MarketingSettings/MarketingSettingsClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;MarketingSettings&gt;</code></summary>
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

```csharp
await client.Email.MarketingSettings.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.MarketingSettings.<a href="/src/Coss/Email/MarketingSettings/MarketingSettingsClient.cs">UpdateAsync</a>(UpdateMarketingSettingsRequest { ... }) -> WithRawResponseTask&lt;MarketingSettings&gt;</code></summary>
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

```csharp
await client.Email.MarketingSettings.UpdateAsync(
    new UpdateMarketingSettingsRequest
    {
        MailingAddress = "Acme Inc., 548 Market St, San Francisco, CA 94104, USA",
    }
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

**request:** `UpdateMarketingSettingsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Received
<details><summary><code>client.Email.Received.<a href="/src/Coss/Email/Received/ReceivedClient.cs">ListAsync</a>(ListReceivedRequest { ... }) -> WithRawResponseTask&lt;ReceivedEmailList&gt;</code></summary>
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

```csharp
await client.Email.Received.ListAsync(new ListReceivedRequest());
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

**request:** `ListReceivedRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Received.<a href="/src/Coss/Email/Received/ReceivedClient.cs">AddressAsync</a>() -> WithRawResponseTask&lt;InboundAddress&gt;</code></summary>
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

```csharp
await client.Email.Received.AddressAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Received.<a href="/src/Coss/Email/Received/ReceivedClient.cs">GetAsync</a>(GetReceivedRequest { ... }) -> WithRawResponseTask&lt;ReceivedEmail&gt;</code></summary>
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

```csharp
await client.Email.Received.GetAsync(
    new GetReceivedRequest { Id = "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetReceivedRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Received.<a href="/src/Coss/Email/Received/ReceivedClient.cs">DeleteAsync</a>(DeleteReceivedRequest { ... }) -> WithRawResponseTask&lt;DeletedReceivedEmail&gt;</code></summary>
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

```csharp
await client.Email.Received.DeleteAsync(
    new DeleteReceivedRequest { Id = "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteReceivedRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Received.<a href="/src/Coss/Email/Received/ReceivedClient.cs">GetRawAsync</a>(GetRawReceivedRequest { ... }) -> WithRawResponseTask&lt;Stream&gt;</code></summary>
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

```csharp
await client.Email.Received.GetRawAsync(new GetRawReceivedRequest { Id = "id" });
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

**request:** `GetRawReceivedRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Received.<a href="/src/Coss/Email/Received/ReceivedClient.cs">GetAttachmentAsync</a>(GetAttachmentReceivedRequest { ... }) -> WithRawResponseTask&lt;Stream&gt;</code></summary>
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

```csharp
await client.Email.Received.GetAttachmentAsync(
    new GetAttachmentReceivedRequest { Id = "id", AttachmentId = "attachment_id" }
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

**request:** `GetAttachmentReceivedRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Contacts Properties
<details><summary><code>client.Email.Contacts.Properties.<a href="/src/Coss/Email/Contacts/Properties/PropertiesClient.cs">ListAsync</a>() -> WithRawResponseTask&lt;ContactPropertyList&gt;</code></summary>
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

```csharp
await client.Email.Contacts.Properties.ListAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.Properties.<a href="/src/Coss/Email/Contacts/Properties/PropertiesClient.cs">CreateAsync</a>(CreateContactPropertyRequest { ... }) -> WithRawResponseTask&lt;ContactProperty&gt;</code></summary>
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

```csharp
await client.Email.Contacts.Properties.CreateAsync(
    new CreateContactPropertyRequest
    {
        Key = "plan",
        Type = CreateContactPropertyRequestType.String,
        Fallback = "free",
    }
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

**request:** `CreateContactPropertyRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.Properties.<a href="/src/Coss/Email/Contacts/Properties/PropertiesClient.cs">GetAsync</a>(GetPropertiesRequest { ... }) -> WithRawResponseTask&lt;ContactProperty&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Contacts.Properties.GetAsync(
    new GetPropertiesRequest { Id = "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetPropertiesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.Properties.<a href="/src/Coss/Email/Contacts/Properties/PropertiesClient.cs">RemoveAsync</a>(RemovePropertiesRequest { ... }) -> WithRawResponseTask&lt;DeletedContactProperty&gt;</code></summary>
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

```csharp
await client.Email.Contacts.Properties.RemoveAsync(
    new RemovePropertiesRequest { Id = "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemovePropertiesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Contacts.Properties.<a href="/src/Coss/Email/Contacts/Properties/PropertiesClient.cs">UpdateAsync</a>(UpdateContactPropertyRequest { ... }) -> WithRawResponseTask&lt;ContactProperty&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Email.Contacts.Properties.UpdateAsync(
    new UpdateContactPropertyRequest
    {
        Id = "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Fallback = "starter",
    }
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

**request:** `UpdateContactPropertyRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Email Templates Versions
<details><summary><code>client.Email.Templates.Versions.<a href="/src/Coss/Email/Templates/Versions/VersionsClient.cs">ListAsync</a>(ListVersionsRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateVersionList&gt;</code></summary>
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

```csharp
await client.Email.Templates.Versions.ListAsync(
    new ListVersionsRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListVersionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.Versions.<a href="/src/Coss/Email/Templates/Versions/VersionsClient.cs">GetAsync</a>(GetVersionsRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateVersion&gt;</code></summary>
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

```csharp
await client.Email.Templates.Versions.GetAsync(
    new GetVersionsRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz", Version = 1 }
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

**request:** `GetVersionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Email.Templates.Versions.<a href="/src/Coss/Email/Templates/Versions/VersionsClient.cs">RestoreAsync</a>(RestoreVersionsRequest { ... }) -> WithRawResponseTask&lt;EmailTemplateVersion&gt;</code></summary>
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

```csharp
await client.Email.Templates.Versions.RestoreAsync(
    new RestoreVersionsRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz", Version = 1 }
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

**request:** `RestoreVersionsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks EventTypes
<details><summary><code>client.Hooks.EventTypes.<a href="/src/Coss/Hooks/EventTypes/EventTypesClient.cs">ListAsync</a>(ListEventTypesRequest { ... }) -> WithRawResponseTask&lt;HookEventTypeList&gt;</code></summary>
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

```csharp
await client.Hooks.EventTypes.ListAsync(new ListEventTypesRequest());
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

**request:** `ListEventTypesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.EventTypes.<a href="/src/Coss/Hooks/EventTypes/EventTypesClient.cs">CreateAsync</a>(CreateHookEventTypeRequest { ... }) -> WithRawResponseTask&lt;HookEventType&gt;</code></summary>
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

```csharp
await client.Hooks.EventTypes.CreateAsync(
    new CreateHookEventTypeRequest
    {
        Name = "invoice.paid",
        Description = "An invoice was paid in full.",
        Examples = new List<Dictionary<string, object?>>()
        {
            new Dictionary<string, object?>()
            {
                { "invoice_id", "in_1042" },
                { "amount", 4200 },
                { "currency", "usd" },
            },
        },
    }
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

**request:** `CreateHookEventTypeRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.EventTypes.<a href="/src/Coss/Hooks/EventTypes/EventTypesClient.cs">GetAsync</a>(GetEventTypesRequest { ... }) -> WithRawResponseTask&lt;HookEventType&gt;</code></summary>
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

```csharp
await client.Hooks.EventTypes.GetAsync(new GetEventTypesRequest { Name = "invoice.paid" });
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

**request:** `GetEventTypesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.EventTypes.<a href="/src/Coss/Hooks/EventTypes/EventTypesClient.cs">ArchiveAsync</a>(ArchiveEventTypesRequest { ... }) -> WithRawResponseTask&lt;HookEventType&gt;</code></summary>
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

```csharp
await client.Hooks.EventTypes.ArchiveAsync(new ArchiveEventTypesRequest { Name = "invoice.paid" });
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

**request:** `ArchiveEventTypesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.EventTypes.<a href="/src/Coss/Hooks/EventTypes/EventTypesClient.cs">UpdateAsync</a>(UpdateHookEventTypeRequest { ... }) -> WithRawResponseTask&lt;HookEventType&gt;</code></summary>
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

```csharp
await client.Hooks.EventTypes.UpdateAsync(
    new UpdateHookEventTypeRequest { Name = "invoice.paid", Archived = false }
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

**request:** `UpdateHookEventTypeRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Applications
<details><summary><code>client.Hooks.Applications.<a href="/src/Coss/Hooks/Applications/ApplicationsClient.cs">ListAsync</a>(ListApplicationsRequest { ... }) -> WithRawResponseTask&lt;HookApplicationList&gt;</code></summary>
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

```csharp
await client.Hooks.Applications.ListAsync(new ListApplicationsRequest());
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

**request:** `ListApplicationsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Applications.<a href="/src/Coss/Hooks/Applications/ApplicationsClient.cs">CreateAsync</a>(CreateHookApplicationRequest { ... }) -> WithRawResponseTask&lt;HookApplication&gt;</code></summary>
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

```csharp
await client.Hooks.Applications.CreateAsync(
    new CreateHookApplicationRequest
    {
        Name = "Acme Corp",
        Uid = "customer_8812",
        Metadata = new Dictionary<string, string>() { { "plan", "pro" } },
    }
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

**request:** `CreateHookApplicationRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Applications.<a href="/src/Coss/Hooks/Applications/ApplicationsClient.cs">GetAsync</a>(GetApplicationsRequest { ... }) -> WithRawResponseTask&lt;HookApplication&gt;</code></summary>
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

```csharp
await client.Hooks.Applications.GetAsync(
    new GetApplicationsRequest { Application = "customer_8812" }
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

**request:** `GetApplicationsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Applications.<a href="/src/Coss/Hooks/Applications/ApplicationsClient.cs">DeleteAsync</a>(DeleteApplicationsRequest { ... }) -> WithRawResponseTask&lt;DeletedHookApplication&gt;</code></summary>
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

```csharp
await client.Hooks.Applications.DeleteAsync(
    new DeleteApplicationsRequest { Application = "customer_8812" }
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

**request:** `DeleteApplicationsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Applications.<a href="/src/Coss/Hooks/Applications/ApplicationsClient.cs">UpdateAsync</a>(UpdateHookApplicationRequest { ... }) -> WithRawResponseTask&lt;HookApplication&gt;</code></summary>
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

```csharp
await client.Hooks.Applications.UpdateAsync(
    new UpdateHookApplicationRequest { Application = "customer_8812", Name = "Acme Corporation" }
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

**request:** `UpdateHookApplicationRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Endpoints
<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">ListAsync</a>(ListEndpointsRequest { ... }) -> WithRawResponseTask&lt;HookEndpointList&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.ListAsync(new ListEndpointsRequest { Application = "customer_8812" });
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

**request:** `ListEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">CreateAsync</a>(CreateHookEndpointRequest { ... }) -> WithRawResponseTask&lt;HookEndpointWithSecret&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.CreateAsync(
    new CreateHookEndpointRequest
    {
        Application = "customer_8812",
        Url = "https://example.com/webhooks",
        FilterTypes = new List<string>() { "invoice.paid" },
    }
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

**request:** `CreateHookEndpointRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">GetAsync</a>(GetEndpointsRequest { ... }) -> WithRawResponseTask&lt;HookEndpoint&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.GetAsync(
    new GetEndpointsRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `GetEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">DeleteAsync</a>(DeleteEndpointsRequest { ... }) -> WithRawResponseTask&lt;DeletedHookEndpoint&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.DeleteAsync(
    new DeleteEndpointsRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `DeleteEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">UpdateAsync</a>(UpdateHookEndpointRequest { ... }) -> WithRawResponseTask&lt;HookEndpoint&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.UpdateAsync(
    new UpdateHookEndpointRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Enabled = false,
    }
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

**request:** `UpdateHookEndpointRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">GetSecretAsync</a>(GetSecretEndpointsRequest { ... }) -> WithRawResponseTask&lt;HookEndpointSecret&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.GetSecretAsync(
    new GetSecretEndpointsRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `GetSecretEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">RollSecretAsync</a>(RollHookEndpointSecretRequest { ... }) -> WithRawResponseTask&lt;HookEndpointWithSecret&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.RollSecretAsync(
    new RollHookEndpointSecretRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        PreviousSecretExpiresIn = 3600,
    }
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

**request:** `RollHookEndpointSecretRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">RecoverAsync</a>(RecoverHookEndpointRequest { ... }) -> WithRawResponseTask&lt;HookEndpointRecovery&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.RecoverAsync(
    new RecoverHookEndpointRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Since = new DateTime(2026, 01, 15, 00, 00, 00, 000),
    }
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

**request:** `RecoverHookEndpointRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">GetRecoveryAsync</a>(GetRecoveryEndpointsRequest { ... }) -> WithRawResponseTask&lt;HookEndpointRecovery&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.GetRecoveryAsync(
    new GetRecoveryEndpointsRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        RecoveryId = "hrec_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `GetRecoveryEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">SendTestAsync</a>(SendHookTestRequest { ... }) -> WithRawResponseTask&lt;HookMessage&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.SendTestAsync(
    new SendHookTestRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        EventType = "invoice.paid",
    }
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

**request:** `SendHookTestRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Endpoints.<a href="/src/Coss/Hooks/Endpoints/EndpointsClient.cs">ListDeliveriesAsync</a>(ListDeliveriesEndpointsRequest { ... }) -> WithRawResponseTask&lt;HookDeliveryList&gt;</code></summary>
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

```csharp
await client.Hooks.Endpoints.ListDeliveriesAsync(
    new ListDeliveriesEndpointsRequest
    {
        Application = "customer_8812",
        EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `ListDeliveriesEndpointsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Messages
<details><summary><code>client.Hooks.Messages.<a href="/src/Coss/Hooks/Messages/MessagesClient.cs">ListAsync</a>(ListMessagesRequest { ... }) -> WithRawResponseTask&lt;HookMessageList&gt;</code></summary>
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

```csharp
await client.Hooks.Messages.ListAsync(new ListMessagesRequest { Application = "customer_8812" });
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

**request:** `ListMessagesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Messages.<a href="/src/Coss/Hooks/Messages/MessagesClient.cs">SendAsync</a>(SendHookMessageRequest { ... }) -> WithRawResponseTask&lt;HookMessage&gt;</code></summary>
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

```csharp
await client.Hooks.Messages.SendAsync(
    new SendHookMessageRequest
    {
        Application = "customer_8812",
        IdempotencyKey = "invoice-1042-paid",
        EventType = "invoice.paid",
        Payload = new Dictionary<string, object?>()
        {
            { "invoice_id", "in_1042" },
            { "amount", 4200 },
            { "currency", "usd" },
        },
    }
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

**request:** `SendHookMessageRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Messages.<a href="/src/Coss/Hooks/Messages/MessagesClient.cs">GetAsync</a>(GetMessagesRequest { ... }) -> WithRawResponseTask&lt;HookMessage&gt;</code></summary>
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

```csharp
await client.Hooks.Messages.GetAsync(
    new GetMessagesRequest
    {
        Application = "customer_8812",
        MessageId = "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `GetMessagesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Messages.<a href="/src/Coss/Hooks/Messages/MessagesClient.cs">ListDeliveriesAsync</a>(ListDeliveriesMessagesRequest { ... }) -> WithRawResponseTask&lt;HookDeliveryList&gt;</code></summary>
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

```csharp
await client.Hooks.Messages.ListDeliveriesAsync(
    new ListDeliveriesMessagesRequest
    {
        Application = "customer_8812",
        MessageId = "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `ListDeliveriesMessagesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Deliveries
<details><summary><code>client.Hooks.Deliveries.<a href="/src/Coss/Hooks/Deliveries/DeliveriesClient.cs">GetAsync</a>(GetDeliveriesRequest { ... }) -> WithRawResponseTask&lt;HookDelivery&gt;</code></summary>
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

```csharp
await client.Hooks.Deliveries.GetAsync(
    new Coss.Hooks.GetDeliveriesRequest
    {
        Application = "customer_8812",
        DeliveryId = "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `GetDeliveriesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Deliveries.<a href="/src/Coss/Hooks/Deliveries/DeliveriesClient.cs">ListAttemptsAsync</a>(ListAttemptsDeliveriesRequest { ... }) -> WithRawResponseTask&lt;HookAttemptList&gt;</code></summary>
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

```csharp
await client.Hooks.Deliveries.ListAttemptsAsync(
    new ListAttemptsDeliveriesRequest
    {
        Application = "customer_8812",
        DeliveryId = "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `ListAttemptsDeliveriesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Hooks.Deliveries.<a href="/src/Coss/Hooks/Deliveries/DeliveriesClient.cs">RetryAsync</a>(RetryDeliveriesRequest { ... }) -> WithRawResponseTask&lt;HookDelivery&gt;</code></summary>
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

```csharp
await client.Hooks.Deliveries.RetryAsync(
    new Coss.Hooks.RetryDeliveriesRequest
    {
        Application = "customer_8812",
        DeliveryId = "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }
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

**request:** `RetryDeliveriesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Hooks Portal
<details><summary><code>client.Hooks.Portal.<a href="/src/Coss/Hooks/Portal/PortalClient.cs">CreateSessionAsync</a>(CreateHookPortalSessionRequest { ... }) -> WithRawResponseTask&lt;HookPortalSession&gt;</code></summary>
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

```csharp
await client.Hooks.Portal.CreateSessionAsync(
    new CreateHookPortalSessionRequest { Application = "customer_8812", ExpiresIn = 3600 }
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

**request:** `CreateHookPortalSessionRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## LogDrains Batches
<details><summary><code>client.LogDrains.Batches.<a href="/src/Coss/LogDrains/Batches/BatchesClient.cs">ListAsync</a>(ListBatchesRequest { ... }) -> WithRawResponseTask&lt;LogDrainBatchList&gt;</code></summary>
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

```csharp
await client.LogDrains.Batches.ListAsync(
    new ListBatchesRequest { Id = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListBatchesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.LogDrains.Batches.<a href="/src/Coss/LogDrains/Batches/BatchesClient.cs">GetAsync</a>(GetBatchesRequest { ... }) -> WithRawResponseTask&lt;LogDrainBatch&gt;</code></summary>
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

```csharp
await client.LogDrains.Batches.GetAsync(
    new GetBatchesRequest
    {
        Id = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
        BatchId = "drainbat_01k7c8n2b5d7f9h1k3m5p7r9tv",
    }
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

**request:** `GetBatchesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Assessments
<details><summary><code>client.Risk.Assessments.<a href="/src/Coss/Risk/Assessments/AssessmentsClient.cs">ListAsync</a>(ListAssessmentsRequest { ... }) -> WithRawResponseTask&lt;RiskAssessmentList&gt;</code></summary>
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

```csharp
await client.Risk.Assessments.ListAsync(new ListAssessmentsRequest());
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

**request:** `ListAssessmentsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Assessments.<a href="/src/Coss/Risk/Assessments/AssessmentsClient.cs">GetAsync</a>(GetAssessmentsRequest { ... }) -> WithRawResponseTask&lt;RiskAssessment&gt;</code></summary>
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

```csharp
await client.Risk.Assessments.GetAsync(
    new GetAssessmentsRequest { Id = "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetAssessmentsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Lists
<details><summary><code>client.Risk.Lists.<a href="/src/Coss/Risk/Lists/ListsClient.cs">ListAsync</a>(ListListsRequest { ... }) -> WithRawResponseTask&lt;RiskListEntryList&gt;</code></summary>
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

```csharp
await client.Risk.Lists.ListAsync(new ListListsRequest());
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

**request:** `ListListsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Lists.<a href="/src/Coss/Risk/Lists/ListsClient.cs">AddAsync</a>(CreateRiskListEntryRequest { ... }) -> WithRawResponseTask&lt;RiskListEntry&gt;</code></summary>
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

```csharp
await client.Risk.Lists.AddAsync(
    new CreateRiskListEntryRequest
    {
        List = RiskList.Block,
        Type = RiskListEntryType.Domain,
        Value = "evil.example",
        Note = "Card testing",
    }
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

**request:** `CreateRiskListEntryRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Lists.<a href="/src/Coss/Risk/Lists/ListsClient.cs">GetAsync</a>(GetListsRequest { ... }) -> WithRawResponseTask&lt;RiskListEntry&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Risk.Lists.GetAsync(new GetListsRequest { Id = "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `GetListsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Lists.<a href="/src/Coss/Risk/Lists/ListsClient.cs">RemoveAsync</a>(RemoveListsRequest { ... }) -> WithRawResponseTask&lt;DeletedRiskListEntry&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Risk.Lists.RemoveAsync(
    new RemoveListsRequest { Id = "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `RemoveListsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Users
<details><summary><code>client.Risk.Users.<a href="/src/Coss/Risk/Users/UsersClient.cs">ForgetAsync</a>(ForgetUsersRequest { ... }) -> WithRawResponseTask&lt;ForgottenRiskUser&gt;</code></summary>
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

```csharp
await client.Risk.Users.ForgetAsync(new ForgetUsersRequest { UserId = "u_42" });
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

**request:** `ForgetUsersRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Settings
<details><summary><code>client.Risk.Settings.<a href="/src/Coss/Risk/Settings/SettingsClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;RiskSettings&gt;</code></summary>
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

```csharp
await client.Risk.Settings.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Settings.<a href="/src/Coss/Risk/Settings/SettingsClient.cs">UpdateAsync</a>(UpdateRiskSettingsRequest { ... }) -> WithRawResponseTask&lt;RiskSettings&gt;</code></summary>
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

```csharp
await client.Risk.Settings.UpdateAsync(
    new UpdateRiskSettingsRequest
    {
        BlockThreshold = 0.9,
        Captcha = new UpdateRiskSettingsRequestCaptcha
        {
            Provider = UpdateRiskSettingsRequestCaptchaProvider.Turnstile,
            Secret = "0x4AAA…",
            Required = true,
        },
    }
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

**request:** `UpdateRiskSettingsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk Rules
<details><summary><code>client.Risk.Rules.<a href="/src/Coss/Risk/Rules/RulesClient.cs">ListAsync</a>() -> WithRawResponseTask&lt;RiskRuleList&gt;</code></summary>
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

```csharp
await client.Risk.Rules.ListAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Rules.<a href="/src/Coss/Risk/Rules/RulesClient.cs">CreateAsync</a>(CreateRiskRuleRequest { ... }) -> WithRawResponseTask&lt;RiskRule&gt;</code></summary>
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

```csharp
await client.Risk.Rules.CreateAsync(
    new CreateRiskRuleRequest
    {
        Name = "Disposable email from a data center",
        Events = new List<RiskEvent>() { RiskEvent.Signup },
        Conditions = new List<RiskRuleCondition>()
        {
            new RiskRuleCondition
            {
                Field = RiskRuleConditionField.EmailDisposable,
                Operator = RiskRuleConditionOperator.Is,
                Value = true,
            },
            new RiskRuleCondition
            {
                Field = RiskRuleConditionField.IpHosting,
                Operator = RiskRuleConditionOperator.Is,
                Value = true,
            },
        },
        Action = RiskDecision.Block,
    }
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

**request:** `CreateRiskRuleRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Rules.<a href="/src/Coss/Risk/Rules/RulesClient.cs">GetAsync</a>(GetRulesRequest { ... }) -> WithRawResponseTask&lt;RiskRule&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Risk.Rules.GetAsync(new GetRulesRequest { Id = "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz" });
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

**request:** `GetRulesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Rules.<a href="/src/Coss/Risk/Rules/RulesClient.cs">DeleteAsync</a>(DeleteRulesRequest { ... }) -> WithRawResponseTask&lt;DeletedRiskRule&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Risk.Rules.DeleteAsync(
    new DeleteRulesRequest { Id = "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteRulesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.Rules.<a href="/src/Coss/Risk/Rules/RulesClient.cs">UpdateAsync</a>(UpdateRiskRuleRequest { ... }) -> WithRawResponseTask&lt;RiskRule&gt;</code></summary>
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

```csharp
await client.Risk.Rules.UpdateAsync(
    new UpdateRiskRuleRequest { Id = "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz", Enabled = false }
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

**request:** `UpdateRiskRuleRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## Risk LimitBuckets
<details><summary><code>client.Risk.LimitBuckets.<a href="/src/Coss/Risk/LimitBuckets/LimitBucketsClient.cs">ListAsync</a>() -> WithRawResponseTask&lt;RiskLimitBucketList&gt;</code></summary>
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

```csharp
await client.Risk.LimitBuckets.ListAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.LimitBuckets.<a href="/src/Coss/Risk/LimitBuckets/LimitBucketsClient.cs">CreateAsync</a>(CreateRiskLimitBucketRequest { ... }) -> WithRawResponseTask&lt;RiskLimitBucket&gt;</code></summary>
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

```csharp
await client.Risk.LimitBuckets.CreateAsync(
    new CreateRiskLimitBucketRequest
    {
        Name = "password_reset",
        Limit = 5,
        PeriodSeconds = 3600,
    }
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

**request:** `CreateRiskLimitBucketRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.LimitBuckets.<a href="/src/Coss/Risk/LimitBuckets/LimitBucketsClient.cs">GetAsync</a>(GetLimitBucketsRequest { ... }) -> WithRawResponseTask&lt;RiskLimitBucket&gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Risk.LimitBuckets.GetAsync(
    new GetLimitBucketsRequest { Id = "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `GetLimitBucketsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.LimitBuckets.<a href="/src/Coss/Risk/LimitBuckets/LimitBucketsClient.cs">DeleteAsync</a>(DeleteLimitBucketsRequest { ... }) -> WithRawResponseTask&lt;DeletedRiskLimitBucket&gt;</code></summary>
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

```csharp
await client.Risk.LimitBuckets.DeleteAsync(
    new DeleteLimitBucketsRequest { Id = "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `DeleteLimitBucketsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Risk.LimitBuckets.<a href="/src/Coss/Risk/LimitBuckets/LimitBucketsClient.cs">UpdateAsync</a>(UpdateRiskLimitBucketRequest { ... }) -> WithRawResponseTask&lt;RiskLimitBucket&gt;</code></summary>
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

```csharp
await client.Risk.LimitBuckets.UpdateAsync(
    new UpdateRiskLimitBucketRequest
    {
        Id = "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz",
        Limit = 10,
        Burst = 20,
    }
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

**request:** `UpdateRiskLimitBucketRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## WebhookEndpoints Deliveries
<details><summary><code>client.WebhookEndpoints.Deliveries.<a href="/src/Coss/WebhookEndpoints/Deliveries/DeliveriesClient.cs">ListAsync</a>(ListDeliveriesRequest { ... }) -> WithRawResponseTask&lt;WebhookDeliveryList&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.Deliveries.ListAsync(
    new ListDeliveriesRequest { Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz" }
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

**request:** `ListDeliveriesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.Deliveries.<a href="/src/Coss/WebhookEndpoints/Deliveries/DeliveriesClient.cs">GetAsync</a>(GetDeliveriesRequest { ... }) -> WithRawResponseTask&lt;WebhookDelivery&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.Deliveries.GetAsync(
    new Coss.WebhookEndpoints.GetDeliveriesRequest
    {
        Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        DeliveryId = "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
    }
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

**request:** `GetDeliveriesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.WebhookEndpoints.Deliveries.<a href="/src/Coss/WebhookEndpoints/Deliveries/DeliveriesClient.cs">RetryAsync</a>(RetryDeliveriesRequest { ... }) -> WithRawResponseTask&lt;WebhookDelivery&gt;</code></summary>
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

```csharp
await client.WebhookEndpoints.Deliveries.RetryAsync(
    new Coss.WebhookEndpoints.RetryDeliveriesRequest
    {
        Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
        DeliveryId = "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
    }
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

**request:** `RetryDeliveriesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

