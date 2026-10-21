using Coss;

namespace Coss.Sms_;

public partial interface ISuppressionsClient
{
    /// <summary>
    /// The SMS suppression list of the API key's environment, newest first: opt-outs, invalid numbers and numbers you added.
    /// </summary>
    WithRawResponseTask<SmsSuppressionList> ListAsync(
        ListSuppressionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Later sends from the API key's environment to the number are skipped. Adding a number already on the list returns its entry with status 200.
    /// </summary>
    WithRawResponseTask<SmsSuppression> AddAsync(
        CreateSmsSuppressionRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    WithRawResponseTask<SmsSuppressionCheck> CheckAsync(
        CheckSuppressionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    WithRawResponseTask<SmsSuppression> GetAsync(
        GetSuppressionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends to the number go out again. Remove an opt-out only when the person asked to receive messages again (they can also reply START).
    /// </summary>
    WithRawResponseTask<DeletedSmsSuppression> RemoveAsync(
        RemoveSuppressionsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
