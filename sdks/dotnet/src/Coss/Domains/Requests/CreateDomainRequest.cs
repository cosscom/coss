using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateDomainRequest
{
    /// <summary>
    /// The domain to send from, without a scheme or path. Subdomains are allowed; internationalized domains must be punycode-encoded.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Add it for one of your live sub-accounts (its id or your uid): only that sub-account sends from it, through its own reputation.
    /// </summary>
    [Optional]
    [JsonPropertyName("subaccount")]
    public string? Subaccount { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
