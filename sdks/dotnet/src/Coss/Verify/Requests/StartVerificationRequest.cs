using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record StartVerificationRequest
{
    /// <summary>
    /// Makes retries safe: a repeated request with the same key and body returns the original verification instead of sending another code, for 24 hours. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    /// <summary>
    /// Where the code goes: a mobile number in E.164 form, or an email address. A pending verification to the same destination and channel is reused: its code is sent again.
    /// </summary>
    [JsonPropertyName("to")]
    public required string To { get; set; }

    /// <summary>
    /// `sms` or `email`. Default: `sms` for a phone number, `email` for an address.
    /// </summary>
    [Optional]
    [JsonPropertyName("channel")]
    public StartVerificationRequestChannel? Channel { get; set; }

    /// <summary>
    /// The end user's IP address. The fraud guard uses it (velocity, Tor); recommended.
    /// </summary>
    [Optional]
    [JsonPropertyName("ip")]
    public string? Ip { get; set; }

    /// <summary>
    /// Your id for the end user, for the fraud guard's velocity and your Risk lists.
    /// </summary>
    [Optional]
    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }

    /// <summary>
    /// Up to 10 tags.
    /// </summary>
    [Optional]
    [JsonPropertyName("tags")]
    public IEnumerable<StartVerificationRequestTagsItem>? Tags { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
