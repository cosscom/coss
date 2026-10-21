namespace Coss;

public partial interface IApiKeyClient
{
    /// <summary>
    /// Revokes the API key making this request, at once: every later request with it fails with `invalid_api_key`. `coss logout --revoke` uses it. Other keys are revoked in the dashboard.
    /// </summary>
    WithRawResponseTask<DeletedApiKey> RevokeAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
