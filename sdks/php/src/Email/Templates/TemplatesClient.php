<?php

namespace Coss\Email\Templates;

use Coss\Email\Templates\Versions\VersionsClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Email\Templates\Requests\ListTemplatesRequest;
use Coss\Types\EmailTemplateList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Email\Templates\Requests\CreateEmailTemplateRequest;
use Coss\Types\EmailTemplate;
use Coss\Core\Client\IdempotencyKey;
use Coss\Types\DeletedEmailTemplate;
use Coss\Email\Templates\Requests\UpdateEmailTemplateRequest;
use Coss\Types\EmailTemplateVersion;
use Coss\Email\Templates\Requests\UpdateEmailTemplateDraftRequest;
use Coss\Email\Templates\Requests\PublishEmailTemplateRequest;
use Coss\Email\Templates\Requests\RenderEmailTemplateRequest;
use Coss\Types\RenderedEmailTemplate;

class TemplatesClient
{
    /**
     * @var VersionsClient $versions
     */
    public VersionsClient $versions;

    /**
     * @var array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options @phpstan-ignore-next-line Property is used in endpoint methods via HttpEndpointGenerator
     */
    private array $options;

    /**
     * @var RawClient $client
     */
    private RawClient $client;

    /**
     * @param RawClient $client
     * @param ?array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options
     */
    public function __construct(
        RawClient $client,
        ?array $options = null,
    ) {
        $this->client = $client;
        $this->options = $options ?? [];
        $this->versions = new VersionsClient($this->client, $this->options);
    }

    /**
     * The environment's templates, newest first. Pass the last `id` as `after` to get the next page while `has_more` is true.
     *
     * Example:
     * ```php
     * $client->email->templates->list(
     *     new ListTemplatesRequest([]),
     * );
     * ```
     *
     * @param ListTemplatesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplateList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListTemplatesRequest $request = new ListTemplatesRequest(), ?array $options = null): ?EmailTemplateList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->after != null) {
            $query['after'] = $request->after;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplateList::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Creates a template with a draft holding its variables and a subject, HTML and text per locale. Sends use it once its draft is published. Not idempotent: retrying after a lost response can create a second template (unless it has an `alias`). Templates belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones. Give a template the same `alias` in every environment to send it by that name.
     *
     * Example:
     * ```php
     * $client->email->templates->create(
     *     new CreateEmailTemplateRequest([
     *         'name' => 'Welcome',
     *         'alias' => 'welcome',
     *         'defaultLocale' => 'en',
     *         'variables' => [
     *             new TemplateVariableInput([
     *                 'name' => 'first_name',
     *                 'type' => TemplateVariableInputType::String->value,
     *                 'required' => true,
     *             ]),
     *         ],
     *         'sampleVariables' => [
     *             'first_name' => "Ada",
     *         ],
     *         'contents' => [
     *             new TemplateContentInput([
     *                 'locale' => 'en',
     *                 'subject' => 'Welcome, {{first_name}}',
     *                 'html' => '<p>Hi {{first_name}}, thanks for signing up!</p>',
     *             ]),
     *             new TemplateContentInput([
     *                 'locale' => 'de',
     *                 'subject' => 'Willkommen, {{first_name}}',
     *                 'html' => '<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>',
     *             ]),
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param CreateEmailTemplateRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplate
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateEmailTemplateRequest $request, ?array $options = null): ?EmailTemplate
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplate::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * A template by id or alias. Its content is in its draft and versions.
     *
     * Example:
     * ```php
     * $client->email->templates->get(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplate
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, ?array $options = null): ?EmailTemplate
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id),
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplate::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Deletes the template with its draft and every version. Emails already sent or scheduled from it keep their content; new sends naming it fail with `template_not_found`.
     *
     * Example:
     * ```php
     * $client->email->templates->delete(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedEmailTemplate
     * @throws CossException
     * @throws CossApiException
     */
    public function delete(string $id, ?array $options = null): ?DeletedEmailTemplate
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id),
                    method: HttpMethod::DELETE,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return DeletedEmailTemplate::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Changes the template's name, alias or description. Changing the alias changes what sends must use. Content changes go to the draft (`PUT /v1/email_templates/{id}/draft`).
     *
     * Example:
     * ```php
     * $client->email->templates->update(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new UpdateEmailTemplateRequest([
     *         'name' => 'Welcome (new users)',
     *     ]),
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param UpdateEmailTemplateRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplate
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $id, UpdateEmailTemplateRequest $request = new UpdateEmailTemplateRequest(), ?array $options = null): ?EmailTemplate
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id),
                    method: HttpMethod::PATCH,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplate::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * The draft (`version: null`): what the next publish makes sends use. `problems` lists syntax errors and undeclared variables, which keep it from being published.
     *
     * Example:
     * ```php
     * $client->email->templates->getDraft(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplateVersion
     * @throws CossException
     * @throws CossApiException
     */
    public function getDraft(string $id, ?array $options = null): ?EmailTemplateVersion
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id) . "/draft",
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplateVersion::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Replaces the draft's variables and content. Sends keep using the published version until the draft is published. Pass the `revision` you read to refuse overwriting someone else's changes. A draft with problems is saved (and reported in `problems`).
     *
     * Example:
     * ```php
     * $client->email->templates->updateDraft(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new UpdateEmailTemplateDraftRequest([
     *         'revision' => 3,
     *         'defaultLocale' => 'en',
     *         'variables' => [
     *             new TemplateVariableInput([
     *                 'name' => 'first_name',
     *                 'type' => TemplateVariableInputType::String->value,
     *                 'required' => true,
     *             ]),
     *         ],
     *         'sampleVariables' => [
     *             'first_name' => "Ada",
     *         ],
     *         'contents' => [
     *             new TemplateContentInput([
     *                 'locale' => 'en',
     *                 'subject' => 'Welcome, {{first_name}}',
     *                 'html' => '<p>Hi {{first_name}}, thanks for signing up!</p>',
     *             ]),
     *             new TemplateContentInput([
     *                 'locale' => 'de',
     *                 'subject' => 'Willkommen, {{first_name}}',
     *                 'html' => '<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>',
     *             ]),
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param UpdateEmailTemplateDraftRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplateVersion
     * @throws CossException
     * @throws CossApiException
     */
    public function updateDraft(string $id, UpdateEmailTemplateDraftRequest $request = new UpdateEmailTemplateDraftRequest(), ?array $options = null): ?EmailTemplateVersion
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id) . "/draft",
                    method: HttpMethod::PUT,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplateVersion::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Copies the draft into the next version, which sends use from then on. Emails already accepted keep the content they were rendered with. A draft without changes since the last publish returns that version, so retrying with the `revision` you reviewed is safe (without it, a retry could publish edits saved in between).
     *
     * Example:
     * ```php
     * $client->email->templates->publish(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new PublishEmailTemplateRequest([
     *         'revision' => 3,
     *     ]),
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param PublishEmailTemplateRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailTemplateVersion
     * @throws CossException
     * @throws CossApiException
     */
    public function publish(string $id, PublishEmailTemplateRequest $request = new PublishEmailTemplateRequest(), ?array $options = null): ?EmailTemplateVersion
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id) . "/publish",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailTemplateVersion::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Renders the draft (or a published `version`) with `variables`, exactly as a send would, and returns the subject, HTML and text: a preview, nothing is sent or stored. Without `variables` it renders the version's `sample_variables`.
     *
     * Example:
     * ```php
     * $client->email->templates->render(
     *     'etpl_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new RenderEmailTemplateRequest([
     *         'locale' => 'en',
     *         'variables' => [
     *             'first_name' => "Ada",
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $id The template's id or alias.
     * @param RenderEmailTemplateRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?RenderedEmailTemplate
     * @throws CossException
     * @throws CossApiException
     */
    public function render(string $id, RenderEmailTemplateRequest $request = new RenderEmailTemplateRequest(), ?array $options = null): ?RenderedEmailTemplate
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/email_templates/" . RawClient::encodePathParam($id) . "/render",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return RenderedEmailTemplate::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }
}
