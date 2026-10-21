using Coss;

namespace Coss.Email;

public partial interface IStorageClient
{
    /// <summary>
    /// Whether coss.com keeps the content of the environment's emails (`content_storage: "store"`, the default) or only until each email is sent, fails or is canceled (`"discard"`). Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the setting that applied when they were sent.
    /// </summary>
    WithRawResponseTask<StorageSettings> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// With `content_storage: "discard"`, emails sent from now on keep their subject, body, headers, template variables and attachment filenames only until they are sent, fail or are canceled (scheduled emails keep them until their time comes); request logs never keep them. Their metadata (addresses, tags, category, status, recipients, events) is kept as usual. Settings belong to the API key's own environment: a `coss_test_…` key only ever changes sandbox settings. Emails keep the setting that applied when they were sent.
    /// </summary>
    WithRawResponseTask<StorageSettings> UpdateAsync(
        UpdateStorageSettingsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
