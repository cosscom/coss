using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record CreateTopicRequest
{
    [JsonPropertyName("key")]
    public required string Key { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// `opt_in`: every subscribed contact gets the topic's emails unless they opt out. `opt_out`: only contacts who opted in do.
    /// </summary>
    [JsonPropertyName("default_subscription")]
    public required CreateTopicRequestDefaultSubscription DefaultSubscription { get; set; }

    /// <summary>
    /// `private` topics never show in the preference center (default `public`).
    /// </summary>
    [JsonPropertyName("visibility")]
    public CreateTopicRequestVisibility? Visibility { get; set; }

    /// <summary>
    /// Order in the preference center (ascending).
    /// </summary>
    [JsonPropertyName("position")]
    public int? Position { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
