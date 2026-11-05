using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateOauthAppRequestZoom : IJsonOnDeserialized
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
    /// The Secret Token of your Zoom app, which signs its events at `zoom_event_url`. Never returned.
    /// </summary>
    [Optional]
    [JsonPropertyName("webhook_secret")]
    public string? WebhookSecret { get; set; }

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
