using Coss;

namespace Coss.Risk;

public partial interface IUsersClient
{
    /// <summary>
    /// Call this when you delete one of your users: coss.com deletes what identifies them in the environment (their mailbox, fraud reports, and the user id, email address, IP address and user agent on their assessments). Decisions and reasons stay. Forgetting a user coss.com doesn't know succeeds too.
    /// </summary>
    WithRawResponseTask<ForgottenRiskUser> ForgetAsync(
        ForgetUsersRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
