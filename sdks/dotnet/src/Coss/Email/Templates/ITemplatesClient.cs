using Coss;
using Coss.Email.Templates;

namespace Coss.Email;

public partial interface ITemplatesClient
{
    public IVersionsClient Versions { get; }

    /// <summary>
    /// The environment's templates, newest first. Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<EmailTemplateList> ListAsync(
        ListTemplatesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a template with a draft holding its variables and a subject, HTML and text per locale. Sends use it once its draft is published. Not idempotent: retrying after a lost response can create a second template (unless it has an `alias`). Templates belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones. Give a template the same `alias` in every environment to send it by that name.
    /// </summary>
    WithRawResponseTask<EmailTemplate> CreateAsync(
        CreateEmailTemplateRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A template by id or alias. Its content is in its draft and versions.
    /// </summary>
    WithRawResponseTask<EmailTemplate> GetAsync(
        GetTemplatesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the template with its draft and every version. Emails already sent or scheduled from it keep their content; new sends naming it fail with `template_not_found`.
    /// </summary>
    WithRawResponseTask<DeletedEmailTemplate> DeleteAsync(
        DeleteTemplatesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the template's name, alias or description. Changing the alias changes what sends must use. Content changes go to the draft (`PUT /v1/email_templates/{id}/draft`).
    /// </summary>
    WithRawResponseTask<EmailTemplate> UpdateAsync(
        UpdateEmailTemplateRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The draft (`version: null`): what the next publish makes sends use. `problems` lists syntax errors and undeclared variables, which keep it from being published.
    /// </summary>
    WithRawResponseTask<EmailTemplateVersion> GetDraftAsync(
        GetDraftTemplatesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces the draft's variables and content. Sends keep using the published version until the draft is published. Pass the `revision` you read to refuse overwriting someone else's changes. A draft with problems is saved (and reported in `problems`).
    /// </summary>
    WithRawResponseTask<EmailTemplateVersion> UpdateDraftAsync(
        UpdateEmailTemplateDraftRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Copies the draft into the next version, which sends use from then on. Emails already accepted keep the content they were rendered with. A draft without changes since the last publish returns that version, so retrying with the `revision` you reviewed is safe (without it, a retry could publish edits saved in between).
    /// </summary>
    WithRawResponseTask<EmailTemplateVersion> PublishAsync(
        PublishEmailTemplateRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Renders the draft (or a published `version`) with `variables`, exactly as a send would, and returns the subject, HTML and text: a preview, nothing is sent or stored. Without `variables` it renders the version's `sample_variables`.
    /// </summary>
    WithRawResponseTask<RenderedEmailTemplate> RenderAsync(
        RenderEmailTemplateRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
