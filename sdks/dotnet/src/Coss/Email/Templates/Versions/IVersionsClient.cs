using Coss;

namespace Coss.Email.Templates;

public partial interface IVersionsClient
{
    /// <summary>
    /// Published versions, newest first. Pass the last `version` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<EmailTemplateVersionList> ListAsync(
        ListVersionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A published version, which never changes.
    /// </summary>
    WithRawResponseTask<EmailTemplateVersion> GetAsync(
        GetVersionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces the draft with a published version's variables and content. Publish the draft to make sends use it again.
    /// </summary>
    WithRawResponseTask<EmailTemplateVersion> RestoreAsync(
        RestoreVersionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
