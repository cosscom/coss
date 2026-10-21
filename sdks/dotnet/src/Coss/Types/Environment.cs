using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// The environment an API key belongs to, with its project and organization.
/// </summary>
[Serializable]
public record Environment : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required EnvironmentObject Object { get; set; }

    /// <summary>
    /// The environment's id.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("slug")]
    public required string Slug { get; set; }

    /// <summary>
    /// `live` delivers email; `sandbox` (`coss_test_` keys) never does.
    /// </summary>
    [JsonPropertyName("mode")]
    public required EnvironmentMode Mode { get; set; }

    [JsonPropertyName("project")]
    public required EnvironmentProject Project { get; set; }

    [JsonPropertyName("organization")]
    public required EnvironmentOrganization Organization { get; set; }

    /// <summary>
    /// The API key making this request.
    /// </summary>
    [JsonPropertyName("api_key")]
    public required EnvironmentApiKey ApiKey { get; set; }

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
