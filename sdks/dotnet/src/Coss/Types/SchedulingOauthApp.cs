using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingOauthApp : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingOauthAppObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("provider")]
    public required SchedulingOauthAppProvider Provider { get; set; }

    [JsonPropertyName("client_id")]
    public required string ClientId { get; set; }

    [Nullable]
    [JsonPropertyName("tenant_id")]
    public string? TenantId { get; set; }

    [Nullable]
    [JsonPropertyName("redirect_uri")]
    public string? RedirectUri { get; set; }

    /// <summary>
    /// Register this with the provider if `redirect_uri` isn't set. If it is, that page forwards `code` and `state` here.
    /// </summary>
    [JsonPropertyName("coss_callback_url")]
    public required string CossCallbackUrl { get; set; }

    [Nullable]
    [JsonPropertyName("completion_url")]
    public string? CompletionUrl { get; set; }

    /// <summary>
    /// Zoom only: the Event notification endpoint URL for your app's deauthorization events.
    /// </summary>
    [Nullable]
    [JsonPropertyName("zoom_event_url")]
    public string? ZoomEventUrl { get; set; }

    /// <summary>
    /// What to enable on your app at the provider.
    /// </summary>
    [JsonPropertyName("scopes")]
    public IEnumerable<string> Scopes { get; set; } = new List<string>();

    /// <summary>
    /// `failing`: the provider refused the app's credentials. New consents are refused, and calendars connected through it can't be read until they work again.
    /// </summary>
    [JsonPropertyName("status")]
    public required SchedulingOauthAppStatus Status { get; set; }

    [Nullable]
    [JsonPropertyName("last_error_code")]
    public string? LastErrorCode { get; set; }

    [Nullable]
    [JsonPropertyName("last_error_at")]
    public string? LastErrorAt { get; set; }

    [Nullable]
    [JsonPropertyName("secret_expires_at")]
    public string? SecretExpiresAt { get; set; }

    /// <summary>
    /// When a consent first completed through this app, which proves its secret.
    /// </summary>
    [Nullable]
    [JsonPropertyName("verified_at")]
    public string? VerifiedAt { get; set; }

    /// <summary>
    /// Calendar connections using this app. It can't be deleted while there are any.
    /// </summary>
    [JsonPropertyName("connections")]
    public required long Connections { get; set; }

    [JsonPropertyName("created_at")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required string UpdatedAt { get; set; }

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
