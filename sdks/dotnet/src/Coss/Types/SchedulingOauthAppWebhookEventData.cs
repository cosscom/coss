using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingOauthAppWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("oauth_app_id")]
    public required string OauthAppId { get; set; }

    [JsonPropertyName("provider")]
    public required string Provider { get; set; }

    /// <summary>
    /// What the provider said, when it refused.
    /// </summary>
    [Nullable]
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("occurred_at")]
    public required string OccurredAt { get; set; }

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
