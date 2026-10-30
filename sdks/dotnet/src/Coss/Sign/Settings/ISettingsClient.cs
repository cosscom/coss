using Coss;

namespace Coss.Sign;

public partial interface ISettingsClient
{
    /// <summary>
    /// The API key's environment's settings: which sites may embed the signing page, how it looks, and the consent text signers accept.
    /// </summary>
    WithRawResponseTask<SignSettings> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the fields given; the others keep their values.
    /// </summary>
    WithRawResponseTask<SignSettings> UpdateAsync(
        UpdateSignSettingsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
