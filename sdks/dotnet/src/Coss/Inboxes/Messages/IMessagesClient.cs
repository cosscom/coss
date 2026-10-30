using Coss;

namespace Coss.Inboxes;

public partial interface IMessagesClient
{
    /// <summary>
    /// Messages of every thread, newest first, with a preview instead of their bodies (retrieve one for those). Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<InboxMessageList> ListAsync(
        ListMessagesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts a thread with a message from the inbox's address, sent like any email (its `email_id` has its delivery events and webhooks; never tracked). Replies to it arrive in the same thread. Live inboxes send only from receiving domains under one of the organization's verified domains (`can_send`); sandbox ones always can, and deliver nothing. Recipients count against the send quota.
    /// </summary>
    WithRawResponseTask<InboxMessage> SendAsync(
        SendInboxMessageRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The message with its text, HTML and `extracted_text`. An outbound message's delivery is its email's (`email_id`).
    /// </summary>
    WithRawResponseTask<InboxMessage> GetAsync(
        GetMessagesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// An inbound message's attachment, always as `application/octet-stream` (its declared type is the attachment's `content_type`): treat it as untrusted.
    /// </summary>
    WithRawResponseTask<global::System.IO.Stream> GetAttachmentAsync(
        GetAttachmentMessagesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replies in the message's thread from the inbox's address: to its sender (its `Reply-To` first), or to an outbound message's recipients again for a follow-up; `reply_all` adds everyone else on it. The subject gets `Re:`, and `In-Reply-To`/`References` let the recipient's mail client thread it. Sent like any email, counted against the send quota.
    /// </summary>
    WithRawResponseTask<InboxMessage> ReplyAsync(
        ReplyInboxMessageRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
