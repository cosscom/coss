using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record Form : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required FormObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    /// <summary>
    /// Where the form posts: `&lt;form action=…&gt;`.
    /// </summary>
    [JsonPropertyName("endpoint")]
    public required string Endpoint { get; set; }

    /// <summary>
    /// The hosted page, when `hosted.enabled`; `null` otherwise.
    /// </summary>
    [Nullable]
    [JsonPropertyName("hosted_url")]
    public string? HostedUrl { get; set; }

    [Nullable]
    [JsonPropertyName("fields")]
    public IEnumerable<FormField>? Fields { get; set; }

    [JsonPropertyName("strict_fields")]
    public required bool StrictFields { get; set; }

    [JsonPropertyName("allowed_origins")]
    public IEnumerable<string> AllowedOrigins { get; set; } = new List<string>();

    [Nullable]
    [JsonPropertyName("redirect_url")]
    public string? RedirectUrl { get; set; }

    [JsonPropertyName("spam")]
    public required FormSpam Spam { get; set; }

    [JsonPropertyName("submitter")]
    public required FormSubmitter Submitter { get; set; }

    [JsonPropertyName("notifications")]
    public required FormNotifications Notifications { get; set; }

    [JsonPropertyName("contacts")]
    public required FormContacts Contacts { get; set; }

    [JsonPropertyName("files")]
    public required FormFiles Files { get; set; }

    [JsonPropertyName("hosted")]
    public required FormHosted Hosted { get; set; }

    /// <summary>
    /// coss.com disabled the form for abuse; contact support.
    /// </summary>
    [JsonPropertyName("disabled_by_admin")]
    public required bool DisabledByAdmin { get; set; }

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required DateTime UpdatedAt { get; set; }

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
