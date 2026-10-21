using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record HookEndpointWithSecret : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required HookEndpointWithSecretObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("application_id")]
    public required string ApplicationId { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("filter_types")]
    public IEnumerable<string> FilterTypes { get; set; } = new List<string>();

    [JsonPropertyName("rate_limit_per_second")]
    public long? RateLimitPerSecond { get; set; }

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    /// <summary>
    /// `manual`: disabled by you or its user. `failing`: its deliveries failed every attempt for five days, so coss.com disabled it. `null` while enabled.
    /// </summary>
    [JsonPropertyName("disabled_reason")]
    public HookEndpointWithSecretDisabledReason? DisabledReason { get; set; }

    [JsonPropertyName("disabled_at")]
    public DateTime? DisabledAt { get; set; }

    /// <summary>
    /// When its current run of failed deliveries began; cleared by the next success. `null` while healthy.
    /// </summary>
    [JsonPropertyName("failing_since")]
    public DateTime? FailingSince { get; set; }

    /// <summary>
    /// After a secret roll, requests are also signed with the previous secret until then.
    /// </summary>
    [JsonPropertyName("previous_secret_expires_at")]
    public DateTime? PreviousSecretExpiresAt { get; set; }

    [JsonPropertyName("metadata")]
    public Dictionary<string, string> Metadata { get; set; } = new Dictionary<string, string>();

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required DateTime UpdatedAt { get; set; }

    /// <summary>
    /// The endpoint's `whsec_…` signing secret (Standard Webhooks).
    /// </summary>
    [JsonPropertyName("secret")]
    public required string Secret { get; set; }

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
