using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record CreateSignRequestFromTemplateRequestSignersItem : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The role's key, e.g. `client`.
    /// </summary>
    [JsonPropertyName("role")]
    public required string Role { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("email")]
    public required string Email { get; set; }

    [Optional]
    [JsonPropertyName("delivery")]
    public CreateSignRequestFromTemplateRequestSignersItemDelivery? Delivery { get; set; }

    [Optional]
    [JsonPropertyName("order")]
    public int? Order { get; set; }

    [Optional]
    [JsonPropertyName("client_ref")]
    public string? ClientRef { get; set; }

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
