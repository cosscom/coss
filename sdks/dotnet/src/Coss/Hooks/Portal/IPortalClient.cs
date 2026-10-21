using Coss;

namespace Coss.Hooks;

public partial interface IPortalClient
{
    /// <summary>
    /// Signs the application's user in to the portal, where they add endpoints, pick event types, see deliveries and retry them, without you building any UI. Create one each time the user opens it (from your backend: never expose the API key) and open or embed the returned `url`; embedding needs the site's origin in the environment's portal settings.
    /// </summary>
    WithRawResponseTask<HookPortalSession> CreateSessionAsync(
        CreateHookPortalSessionRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
