using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ListEmailRequest
{
    /// <summary>
    /// Only emails with this recipient (in `to`, `cc` or `bcc`; the bare address, any case).
    /// </summary>
    [JsonIgnore]
    public string? To { get; set; }

    /// <summary>
    /// Only emails with a recipient in one of these statuses, comma-separated: `bounced,complained`. With `to`, that recipient's status.
    /// </summary>
    [JsonIgnore]
    public string? RecipientStatus { get; set; }

    /// <summary>
    /// Only emails in these statuses, comma-separated: `failed`.
    /// </summary>
    [JsonIgnore]
    public string? Status { get; set; }

    /// <summary>
    /// Free text, matched against the subject and the `to` addresses.
    /// </summary>
    [JsonIgnore]
    public string? Q { get; set; }

    /// <summary>
    /// Only emails of this category.
    /// </summary>
    [JsonIgnore]
    public string? Category { get; set; }

    /// <summary>
    /// Only the emails of this batch.
    /// </summary>
    [JsonIgnore]
    public string? BatchId { get; set; }

    /// <summary>
    /// Only the emails sent for this sub-account (its id or your uid).
    /// </summary>
    [JsonIgnore]
    public string? Subaccount { get; set; }

    /// <summary>
    /// Only emails created at or after this time.
    /// </summary>
    [JsonIgnore]
    public DateTime? CreatedAfter { get; set; }

    /// <summary>
    /// Only emails created before this time.
    /// </summary>
    [JsonIgnore]
    public DateTime? CreatedBefore { get; set; }

    /// <summary>
    /// 1-100, default 20.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last email of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
