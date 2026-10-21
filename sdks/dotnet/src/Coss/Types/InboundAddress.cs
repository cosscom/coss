using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record InboundAddress : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required InboundAddressObject Object { get; set; }

    [JsonPropertyName("environment_id")]
    public required string EnvironmentId { get; set; }

    /// <summary>
    /// Email sent to any address at this domain is received by the environment, with no DNS setup. It never changes.
    /// </summary>
    [JsonPropertyName("domain")]
    public required string Domain { get; set; }

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
