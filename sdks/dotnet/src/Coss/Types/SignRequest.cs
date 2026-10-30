using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignRequest : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SignRequestObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// `draft` until sent, `sent` while signers sign, then `completed` (everyone signed), `declined` (a signer declined), `canceled` or `expired`.
    /// </summary>
    [JsonPropertyName("status")]
    public required SignRequestStatus Status { get; set; }

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [Nullable]
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("signing_order")]
    public required SignRequestSigningOrder SigningOrder { get; set; }

    [JsonPropertyName("documents")]
    public IEnumerable<SignRequestDocumentsItem> Documents { get; set; } =
        new List<SignRequestDocumentsItem>();

    [JsonPropertyName("signers")]
    public IEnumerable<SignSigner> Signers { get; set; } = new List<SignSigner>();

    [JsonPropertyName("fields")]
    public IEnumerable<SignField> Fields { get; set; } = new List<SignField>();

    [JsonPropertyName("metadata")]
    public Dictionary<string, string> Metadata { get; set; } = new Dictionary<string, string>();

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    /// <summary>
    /// Days between automatic reminders to email signers; `null`: none.
    /// </summary>
    [Nullable]
    [JsonPropertyName("reminder_interval_days")]
    public long? ReminderIntervalDays { get; set; }

    [Nullable]
    [JsonPropertyName("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [Nullable]
    [JsonPropertyName("expired_at")]
    public DateTime? ExpiredAt { get; set; }

    [Nullable]
    [JsonPropertyName("sent_at")]
    public DateTime? SentAt { get; set; }

    [Nullable]
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Nullable]
    [JsonPropertyName("canceled_at")]
    public DateTime? CanceledAt { get; set; }

    [Nullable]
    [JsonPropertyName("declined_at")]
    public DateTime? DeclinedAt { get; set; }

    /// <summary>
    /// The completed document, sealed by coss.com: every document with the signatures and values filled in, and a certificate of completion. `null` until it is ready (shortly after `completed`, announced by the `sign_request.completed` webhook); download it from `GET /v1/sign/requests/{id}/signed_document`.
    /// </summary>
    [Nullable]
    [JsonPropertyName("signed_document")]
    public SignRequestSignedDocument? SignedDocument { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
