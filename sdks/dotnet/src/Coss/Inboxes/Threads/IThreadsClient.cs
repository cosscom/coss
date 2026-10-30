using Coss;

namespace Coss.Inboxes;

public partial interface IThreadsClient
{
    /// <summary>
    /// The inbox's conversations, the one with the latest message first, with a preview of that message. A thread whose `last_inbound_at` equals its `last_message_at` awaits a reply. Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<InboxThreadList> ListAsync(
        ListThreadsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The conversation with its latest messages, oldest first, each with its text and `extracted_text` (its own words, without the quoted conversation): what an agent reads before it replies. HTML is the sender's: sanitize it before showing it to anyone.
    /// </summary>
    WithRawResponseTask<InboxThread> GetAsync(
        GetThreadsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the conversation from the inbox. Its received emails and emails stay in the environment until their retention ends; a later reply starts a new thread.
    /// </summary>
    WithRawResponseTask<DeletedInboxThread> DeleteAsync(
        DeleteThreadsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
