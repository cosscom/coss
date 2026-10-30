using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UpdateInboxRequest
{
    /// <summary>
    /// The inbox's id.
    /// </summary>
    [JsonIgnore]
    public required string InboxId { get; set; }

    /// <summary>
    /// The name messages are sent with; `null` sends with the bare address.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("display_name")]
    public Optional<string?> DisplayName { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
