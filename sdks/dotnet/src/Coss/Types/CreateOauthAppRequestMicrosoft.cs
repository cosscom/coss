using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateOauthAppRequestMicrosoft : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The app's client ID at the provider.
    /// </summary>
    [JsonPropertyName("client_id")]
    public required string ClientId { get; set; }

    /// <summary>
    /// The app's client secret. Never returned.
    /// </summary>
    [JsonPropertyName("client_secret")]
    public required string ClientSecret { get; set; }

    /// <summary>
    /// The Directory (tenant) ID, for an app that's only for your own tenant. Leave it out for a multi-tenant app.
    /// </summary>
    [Optional]
    [JsonPropertyName("tenant_id")]
    public string? TenantId { get; set; }

    /// <summary>
    /// A page on your own domain, registered with the provider, that forwards `code` and `state` to `coss_callback_url`. Google requires this for an external app, since it has to verify the redirect's domain as yours. Leave it out to use `coss_callback_url` directly.
    /// </summary>
    [Optional]
    [JsonPropertyName("redirect_uri")]
    public string? RedirectUri { get; set; }

    /// <summary>
    /// Where the browser lands after a consent that didn't name a `return_url`, with `coss_calendar` set to `connected`, `denied` or `invalid`. Leave it out for a plain page saying what happened.
    /// </summary>
    [Optional]
    [JsonPropertyName("completion_url")]
    public string? CompletionUrl { get; set; }

    /// <summary>
    /// When the client secret expires. Owners and admins are warned 14 days before.
    /// </summary>
    [Optional]
    [JsonPropertyName("secret_expires_at")]
    public DateTime? SecretExpiresAt { get; set; }

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
