using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateTopicRequest
{
    /// <summary>
    /// The topic's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [Optional]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("description")]
    public Optional<string?> Description { get; set; }

    /// <summary>
    /// `opt_in`: every subscribed contact gets the topic's emails unless they opt out. `opt_out`: only contacts who opted in do.
    /// </summary>
    [Optional]
    [JsonPropertyName("default_subscription")]
    public UpdateTopicRequestDefaultSubscription? DefaultSubscription { get; set; }

    /// <summary>
    /// `private` topics never show in the preference center (default `public`).
    /// </summary>
    [Optional]
    [JsonPropertyName("visibility")]
    public UpdateTopicRequestVisibility? Visibility { get; set; }

    /// <summary>
    /// Order in the preference center (ascending).
    /// </summary>
    [Optional]
    [JsonPropertyName("position")]
    public int? Position { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
