using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateInboxRequest
{
    /// <summary>
    /// The part before the @. Omit it for a random one. Mail to `username+anything@domain` reaches the inbox too.
    /// </summary>
    [Optional]
    [JsonPropertyName("username")]
    public string? Username { get; set; }

    /// <summary>
    /// One of the environment's receiving domains (its hostname). Omit it for the environment's own domain under coss.com's inbound domain, which needs no DNS setup.
    /// </summary>
    [Optional]
    [JsonPropertyName("domain")]
    public string? Domain { get; set; }

    /// <summary>
    /// The name messages from the inbox are sent with.
    /// </summary>
    [Optional]
    [JsonPropertyName("display_name")]
    public string? DisplayName { get; set; }

    /// <summary>
    /// Your own id for the inbox (unique per environment). Creating an inbox with a `client_id` that already has one returns that inbox instead (200), so retries and "one inbox per user" need no bookkeeping.
    /// </summary>
    [Optional]
    [JsonPropertyName("client_id")]
    public string? ClientId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
