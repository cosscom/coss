using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record EmailTemplate : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required EmailTemplateObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [Nullable]
    [JsonPropertyName("alias")]
    public string? Alias { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [Nullable]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// The version sends use; `null` until the draft is first published.
    /// </summary>
    [Nullable]
    [JsonPropertyName("published_version")]
    public long? PublishedVersion { get; set; }

    [Nullable]
    [JsonPropertyName("published_at")]
    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// Whether the draft was changed since it was last published.
    /// </summary>
    [JsonPropertyName("has_unpublished_changes")]
    public required bool HasUnpublishedChanges { get; set; }

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
