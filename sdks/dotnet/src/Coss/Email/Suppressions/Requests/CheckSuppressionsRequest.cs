using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record CheckSuppressionsRequest
{
    /// <summary>
    /// The address to check.
    /// </summary>
    [JsonIgnore]
    public required string Address { get; set; }

    /// <summary>
    /// The category of the email you plan to send. Without it, only `*` entries count.
    /// </summary>
    [JsonIgnore]
    public string? Category { get; set; }

    /// <summary>
    /// The stream of the email you plan to send (default `transactional`). `marketing` also counts `stream:marketing` entries.
    /// </summary>
    [JsonIgnore]
    public CheckSuppressionsRequestStream? Stream { get; set; }

    /// <summary>
    /// The sub-account you plan to send for (its id or your uid): its own entries count too.
    /// </summary>
    [JsonIgnore]
    public string? Subaccount { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
