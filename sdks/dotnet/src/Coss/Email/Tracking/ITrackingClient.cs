using Coss;

namespace Coss.Email;

public partial interface ITrackingClient
{
    /// <summary>
    /// The environment's open and click tracking default and its category rules. For each of `opens` and `clicks`, a send's own `tracking` wins, then the rule for its `category`, then the default, then off. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
    /// </summary>
    WithRawResponseTask<TrackingSettings> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the environment default: emails without a rule for their category are then not tracked unless the send asks. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
    /// </summary>
    WithRawResponseTask<DeletedTrackingRule> RemoveDefaultAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets the environment default, which applies to emails without a rule for their category. Fields left out keep their value; if there is no default yet, it is created with them off. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
    /// </summary>
    WithRawResponseTask<TrackingRule> UpdateDefaultAsync(
        UpdateTrackingRuleRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the rule: emails of this category follow the environment default again. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
    /// </summary>
    WithRawResponseTask<DeletedTrackingRule> RemoveCategoryAsync(
        RemoveCategoryTrackingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets the rule for emails sent with this `category`, which wins over the environment default, e.g. to track `marketing` but never `password-reset`. Fields left out keep their value; a new rule is created with them off. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the settings that applied when they were sent.
    /// </summary>
    WithRawResponseTask<TrackingRule> UpdateCategoryAsync(
        UpdateCategoryTrackingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
