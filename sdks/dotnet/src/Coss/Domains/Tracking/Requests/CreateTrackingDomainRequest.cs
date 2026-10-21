using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Domains;

[Serializable]
public record CreateTrackingDomainRequest
{
    /// <summary>
    /// The domain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// A subdomain of the domain to serve tracking links from, without a scheme or path. Point it at coss.com with the CNAME record the response lists.
    /// </summary>
    [JsonPropertyName("hostname")]
    public required string Hostname { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
