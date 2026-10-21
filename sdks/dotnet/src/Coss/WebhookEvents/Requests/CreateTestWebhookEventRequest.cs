using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateTestWebhookEventRequest
{
    /// <summary>
    /// The event type. `domain.*`, `account.*` and `billing.*` events only reach live environments, so they can't be tested in a sandbox one.
    /// </summary>
    [JsonPropertyName("type")]
    public required CreateTestWebhookEventRequestType Type { get; set; }

    /// <summary>
    /// Fields merged over the sample's `data` (objects field by field, anything else replaced), in the latest API version's shape: e.g. a real `email_id`, or the `recipient` your handler looks for. Unknown fields are refused.
    /// </summary>
    [JsonPropertyName("data")]
    public Dictionary<string, object?>? Data { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
