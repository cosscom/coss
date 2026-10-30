using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record FormSubmission : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required FormSubmissionObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("form_id")]
    public required string FormId { get; set; }

    /// <summary>
    /// `accepted`: delivered (webhooks, notifications, contacts). `held`: Risk asked for a review. `spam`: refused by Risk, the content check or the honeypot. `pending_confirmation`: waiting for the submitter's email link.
    /// </summary>
    [JsonPropertyName("status")]
    public required FormSubmissionStatus Status { get; set; }

    /// <summary>
    /// Field name → value; a field posted several times has an array.
    /// </summary>
    [JsonPropertyName("data")]
    public Dictionary<string, OneOf<string, IEnumerable<string>>> Data { get; set; } =
        new Dictionary<string, OneOf<string, IEnumerable<string>>>();

    [Nullable]
    [JsonPropertyName("submitter_email")]
    public string? SubmitterEmail { get; set; }

    [JsonPropertyName("files")]
    public IEnumerable<FormSubmissionFile> Files { get; set; } = new List<FormSubmissionFile>();

    [Nullable]
    [JsonPropertyName("spam_reason")]
    public FormSubmissionSpamReason? SpamReason { get; set; }

    /// <summary>
    /// Risk's assessment; `null` when none ran (honeypot).
    /// </summary>
    [Nullable]
    [JsonPropertyName("risk")]
    public FormSubmissionRisk? Risk { get; set; }

    [Nullable]
    [JsonPropertyName("ip")]
    public string? Ip { get; set; }

    [Nullable]
    [JsonPropertyName("user_agent")]
    public string? UserAgent { get; set; }

    [Nullable]
    [JsonPropertyName("origin")]
    public string? Origin { get; set; }

    [Nullable]
    [JsonPropertyName("referrer")]
    public string? Referrer { get; set; }

    [Nullable]
    [JsonPropertyName("confirmed_at")]
    public DateTime? ConfirmedAt { get; set; }

    [Nullable]
    [JsonPropertyName("accepted_at")]
    public DateTime? AcceptedAt { get; set; }

    [Nullable]
    [JsonPropertyName("released_at")]
    public DateTime? ReleasedAt { get; set; }

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

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
