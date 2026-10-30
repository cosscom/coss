using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record FormSubmissionWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("form_id")]
    public required string FormId { get; set; }

    [JsonPropertyName("form_name")]
    public required string FormName { get; set; }

    [JsonPropertyName("submission_id")]
    public required string SubmissionId { get; set; }

    [JsonPropertyName("status")]
    public required FormSubmissionWebhookEventDataStatus Status { get; set; }

    /// <summary>
    /// Field name → value; a field posted several times has an array.
    /// </summary>
    [JsonPropertyName("data")]
    public Dictionary<string, OneOf<string, IEnumerable<string>>> Data { get; set; } =
        new Dictionary<string, OneOf<string, IEnumerable<string>>>();

    [Nullable]
    [JsonPropertyName("submitter_email")]
    public string? SubmitterEmail { get; set; }

    /// <summary>
    /// Uploaded files (download them with the API; never their bytes here).
    /// </summary>
    [JsonPropertyName("files")]
    public IEnumerable<FormSubmissionFile> Files { get; set; } = new List<FormSubmissionFile>();

    [Nullable]
    [JsonPropertyName("spam_reason")]
    public FormSubmissionWebhookEventDataSpamReason? SpamReason { get; set; }

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

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
