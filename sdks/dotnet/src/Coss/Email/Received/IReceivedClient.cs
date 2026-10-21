using Coss;

namespace Coss.Email;

public partial interface IReceivedClient
{
    /// <summary>
    /// Emails received by the API key's environment, newest first, without their bodies and headers (retrieve one for those). Pass the last `id` as `after` to get the next page while `has_more` is true. An `email.received` webhook announces each one as it arrives.
    /// </summary>
    WithRawResponseTask<ReceivedEmailList> ListAsync(
        ListReceivedRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The environment's own domain under coss.com's inbound domain: email sent to any address at it (e.g. `support@&lt;domain&gt;`) is received by this environment, with no DNS setup. To receive at your own domain, add a receiving domain instead.
    /// </summary>
    WithRawResponseTask<InboundAddress> AddressAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The received email with its headers, text and HTML bodies (each cut at 2 MB, see `truncated`) and attachment metadata. HTML is the sender's: sanitize it before showing it to anyone.
    /// </summary>
    WithRawResponseTask<ReceivedEmail> GetAsync(
        GetReceivedRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the received email with its raw message and attachments right away, instead of at the end of its retention period.
    /// </summary>
    WithRawResponseTask<DeletedReceivedEmail> DeleteAsync(
        DeleteReceivedRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The whole message as received (`message/rfc822`), for your own MIME parser or archive.
    /// </summary>
    WithRawResponseTask<global::System.IO.Stream> GetRawAsync(
        GetRawReceivedRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The attachment's bytes, always as `application/octet-stream` (its declared type is the attachment's `content_type`): treat them as untrusted.
    /// </summary>
    WithRawResponseTask<global::System.IO.Stream> GetAttachmentAsync(
        GetAttachmentReceivedRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
