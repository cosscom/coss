using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateRiskAssessmentRequest
{
    /// <summary>
    /// Makes retries safe: a repeated request with the same key and body returns the original assessment instead of assessing (and counting) the event again, for 24 hours. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("event")]
    public required RiskEvent Event { get; set; }

    /// <summary>
    /// Required for `custom` events (e.g. `invite_sent`), not allowed otherwise.
    /// </summary>
    [Optional]
    [JsonPropertyName("event_name")]
    public string? EventName { get; set; }

    [Optional]
    [JsonPropertyName("user")]
    public CreateRiskAssessmentRequestUser? User { get; set; }

    /// <summary>
    /// The client's IP address (not your server's or proxy's).
    /// </summary>
    [Optional]
    [JsonPropertyName("ip")]
    public string? Ip { get; set; }

    /// <summary>
    /// The client's user agent.
    /// </summary>
    [Optional]
    [JsonPropertyName("user_agent")]
    public string? UserAgent { get; set; }

    [Optional]
    [JsonPropertyName("captcha")]
    public CreateRiskAssessmentRequestCaptcha? Captcha { get; set; }

    [Optional]
    [JsonPropertyName("checkout")]
    public RiskCheckoutRequest? Checkout { get; set; }

    /// <summary>
    /// The browser the event came from: recognizes it across accounts (`duplicate.device`, device velocity, fraud memory) and spots automation.
    /// </summary>
    [Optional]
    [JsonPropertyName("device")]
    public CreateRiskAssessmentRequestDevice? Device { get; set; }

    /// <summary>
    /// Content to classify with the event. Its scores go in `signals.content` and rules can test them; `content.*` reasons fire only at thresholds you set.
    /// </summary>
    [Optional]
    [JsonPropertyName("content")]
    public CreateRiskAssessmentRequestContent? Content { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
