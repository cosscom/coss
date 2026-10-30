using Coss;

namespace Coss.Sign;

public partial interface ISessionsClient
{
    /// <summary>
    /// A short-lived link to the signing page for one `embedded` signer of a sent request. Your app vouches for who the signer is (the audit trail records `customer_asserted`), so create it only for that signed-in user, when they open the page that shows it. Embed the `url` in an iframe from an origin in your Sign settings' `allowed_origins` (`mountSigning` from `coss/sign` does it), or redirect to it. Each call creates a new session.
    /// </summary>
    WithRawResponseTask<SignSession> CreateAsync(
        CreateSignSessionRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
