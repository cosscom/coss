using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record CreateSignSessionRequest
{
    /// <summary>
    /// The signature request's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The signer's id (`signers[].id` of the request).
    /// </summary>
    [JsonIgnore]
    public required string SignerId { get; set; }

    /// <summary>
    /// Seconds until the link expires: default 3600, at most 86400. Mint one when your user opens the page that shows it.
    /// </summary>
    [Optional]
    [JsonPropertyName("expires_in")]
    public int? ExpiresIn { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
