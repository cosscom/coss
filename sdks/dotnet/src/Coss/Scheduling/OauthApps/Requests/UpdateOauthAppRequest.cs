using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record UpdateOauthAppRequest
{
    /// <summary>
    /// The OAuth app's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// A new client secret. It's tried on a connection before it replaces the old one.
    /// </summary>
    [Optional]
    [JsonPropertyName("client_secret")]
    public string? ClientSecret { get; set; }

    /// <summary>
    /// The Directory (tenant) ID, for an app that's only for your own tenant. Leave it out for a multi-tenant app.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("tenant_id")]
    public Optional<string?> TenantId { get; set; }

    /// <summary>
    /// The Secret Token of your Zoom app, which signs its events at `zoom_event_url`. Never returned.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("webhook_secret")]
    public Optional<string?> WebhookSecret { get; set; }

    /// <summary>
    /// A page on your own domain, registered with the provider, that forwards `code` and `state` to `coss_callback_url`. Google requires this for an external app, since it has to verify the redirect's domain as yours. Leave it out to use `coss_callback_url` directly.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("redirect_uri")]
    public Optional<string?> RedirectUri { get; set; }

    /// <summary>
    /// Where the browser lands after a consent that didn't name a `return_url`, with `coss_calendar` set to `connected`, `denied` or `invalid`. Leave it out for a plain page saying what happened.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("completion_url")]
    public Optional<string?> CompletionUrl { get; set; }

    /// <summary>
    /// When the client secret expires. Owners and admins are warned 14 days before.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("secret_expires_at")]
    public Optional<DateTime?> SecretExpiresAt { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
