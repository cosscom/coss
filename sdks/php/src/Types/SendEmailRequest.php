<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Union;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class SendEmailRequest extends JsonSerializableType
{
    /**
     * @var string $from An email address, optionally with a display name: "Acme <hello@acme.com>".
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var (
     *    string
     *   |array<string>
     * ) $to
     */
    #[JsonProperty('to'), Union('string', ['string'])]
    public string|array $to;

    /**
     * @var (
     *    string
     *   |array<string>
     * )|null $cc
     */
    #[JsonProperty('cc'), Union('string', ['string'], 'null')]
    public string|array|null $cc;

    /**
     * @var (
     *    string
     *   |array<string>
     * )|null $bcc
     */
    #[JsonProperty('bcc'), Union('string', ['string'], 'null')]
    public string|array|null $bcc;

    /**
     * @var (
     *    string
     *   |array<string>
     * )|null $replyTo
     */
    #[JsonProperty('reply_to'), Union('string', ['string'], 'null')]
    public string|array|null $replyTo;

    /**
     * @var ?string $subject Required unless the email is sent from a template (`template_id`).
     */
    #[JsonProperty('subject')]
    public ?string $subject;

    /**
     * @var ?string $html HTML body. Provide `html`, `text`, or both.
     */
    #[JsonProperty('html')]
    public ?string $html;

    /**
     * @var ?string $text Plain-text body. Without it, an `html` email goes out with a text part generated from the HTML.
     */
    #[JsonProperty('text')]
    public ?string $text;

    /**
     * @var ?string $templateId Send a published email template (its id or alias) instead of `subject`, `html` and `text`.
     */
    #[JsonProperty('template_id')]
    public ?string $templateId;

    /**
     * @var ?int $templateVersion A published version of the template to send. Defaults to the latest one.
     */
    #[JsonProperty('template_version')]
    public ?int $templateVersion;

    /**
     * @var ?string $locale The template locale to send, e.g. "pt-BR". Falls back to the language ("pt"), then to the template's default locale.
     */
    #[JsonProperty('locale')]
    public ?string $locale;

    /**
     * @var ?array<string, mixed> $variables Values for the template's variables, keyed by name.
     */
    #[JsonProperty('variables'), ArrayType(['string' => 'mixed'])]
    public ?array $variables;

    /**
     * @var ?array<string, string> $headers Up to 15 custom headers. Names are case-insensitive.
     */
    #[JsonProperty('headers'), ArrayType(['string' => 'string'])]
    public ?array $headers;

    /**
     * @var ?array<SendEmailRequestTagsItem> $tags
     */
    #[JsonProperty('tags'), ArrayType([SendEmailRequestTagsItem::class])]
    public ?array $tags;

    /**
     * @var ?string $category What kind of email this is, e.g. "marketing". Recipients suppressed for this category (or for every email) are skipped.
     */
    #[JsonProperty('category')]
    public ?string $category;

    /**
     * @var ?DateTime $scheduledAt Send the email at this time instead of now (ISO 8601 with an offset, at most 30 days ahead). A time that is not in the future sends immediately. Scheduled emails can be rescheduled or canceled until they are sent.
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $scheduledAt;

    /**
     * @var ?array<SendEmailAttachment> $attachments Up to 20 files, at most 25 MB combined.
     */
    #[JsonProperty('attachments'), ArrayType([SendEmailAttachment::class])]
    public ?array $attachments;

    /**
     * @var ?TrackingOptions $tracking
     */
    #[JsonProperty('tracking')]
    public ?TrackingOptions $tracking;

    /**
     * @var ?value-of<SendEmailRequestStream> $stream `transactional` (the default) or `marketing`. Marketing email goes out on its own sending infrastructure and reputation, so its complaints never hold up transactional mail. It needs the environment's postal address (marketing settings), exactly one recipient, and no `List-Unsubscribe` header: coss.com adds one-click unsubscribe headers and a footer with the address and an unsubscribe link (place them yourself with `{{{unsubscribe_url}}}`, `{{{preferences_url}}}` and `{{{mailing_address}}}`). Contacts who unsubscribed are skipped.
     */
    #[JsonProperty('stream')]
    public ?string $stream;

    /**
     * @param array{
     *   from: string,
     *   to: (
     *    string
     *   |array<string>
     * ),
     *   cc?: (
     *    string
     *   |array<string>
     * )|null,
     *   bcc?: (
     *    string
     *   |array<string>
     * )|null,
     *   replyTo?: (
     *    string
     *   |array<string>
     * )|null,
     *   subject?: ?string,
     *   html?: ?string,
     *   text?: ?string,
     *   templateId?: ?string,
     *   templateVersion?: ?int,
     *   locale?: ?string,
     *   variables?: ?array<string, mixed>,
     *   headers?: ?array<string, string>,
     *   tags?: ?array<SendEmailRequestTagsItem>,
     *   category?: ?string,
     *   scheduledAt?: ?DateTime,
     *   attachments?: ?array<SendEmailAttachment>,
     *   tracking?: ?TrackingOptions,
     *   stream?: ?value-of<SendEmailRequestStream>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->from = $values['from'];
        $this->to = $values['to'];
        $this->cc = $values['cc'] ?? null;
        $this->bcc = $values['bcc'] ?? null;
        $this->replyTo = $values['replyTo'] ?? null;
        $this->subject = $values['subject'] ?? null;
        $this->html = $values['html'] ?? null;
        $this->text = $values['text'] ?? null;
        $this->templateId = $values['templateId'] ?? null;
        $this->templateVersion = $values['templateVersion'] ?? null;
        $this->locale = $values['locale'] ?? null;
        $this->variables = $values['variables'] ?? null;
        $this->headers = $values['headers'] ?? null;
        $this->tags = $values['tags'] ?? null;
        $this->category = $values['category'] ?? null;
        $this->scheduledAt = $values['scheduledAt'] ?? null;
        $this->attachments = $values['attachments'] ?? null;
        $this->tracking = $values['tracking'] ?? null;
        $this->stream = $values['stream'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
