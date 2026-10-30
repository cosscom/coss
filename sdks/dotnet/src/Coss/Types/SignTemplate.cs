using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignTemplate : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SignTemplateObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [Nullable]
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [Nullable]
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("signing_order")]
    public required SignTemplateSigningOrder SigningOrder { get; set; }

    [JsonPropertyName("documents")]
    public IEnumerable<SignTemplateDocumentsItem> Documents { get; set; } =
        new List<SignTemplateDocumentsItem>();

    [JsonPropertyName("roles")]
    public IEnumerable<SignTemplateRolesItem> Roles { get; set; } =
        new List<SignTemplateRolesItem>();

    [JsonPropertyName("fields")]
    public IEnumerable<SignTemplateFieldsItem> Fields { get; set; } =
        new List<SignTemplateFieldsItem>();

    /// <summary>
    /// It has documents and every role has a `signature` field, so requests can be made from it.
    /// </summary>
    [JsonPropertyName("ready")]
    public required bool Ready { get; set; }

    [JsonPropertyName("sandbox")]
    public required bool Sandbox { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required DateTime UpdatedAt { get; set; }

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
