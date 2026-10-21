using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record DmarcSource : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("source_ip")]
    public required string SourceIp { get; set; }

    /// <summary>
    /// The domain in the messages' From header.
    /// </summary>
    [JsonPropertyName("header_from")]
    public required string HeaderFrom { get; set; }

    [JsonPropertyName("messages")]
    public required long Messages { get; set; }

    /// <summary>
    /// Messages that passed DMARC.
    /// </summary>
    [JsonPropertyName("passing")]
    public required long Passing { get; set; }

    /// <summary>
    /// Signed with the domain's coss.com DKIM keys or sent from its coss.com MAIL FROM domain.
    /// </summary>
    [JsonPropertyName("via_coss")]
    public required bool ViaCoss { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
