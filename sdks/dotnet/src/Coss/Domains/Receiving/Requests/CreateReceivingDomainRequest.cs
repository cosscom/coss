using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Domains;

[Serializable]
public record CreateReceivingDomainRequest
{
    /// <summary>
    /// The domain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The domain itself or a subdomain of it, without a scheme or path. Point its MX at coss.com with the record the response lists. Using the domain itself moves all of its mail to coss.com, so a subdomain is usually the better choice.
    /// </summary>
    [JsonPropertyName("hostname")]
    public required string Hostname { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
