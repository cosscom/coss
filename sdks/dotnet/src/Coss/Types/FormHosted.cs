using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record FormHosted : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    [Nullable]
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [Nullable]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [Nullable]
    [JsonPropertyName("submit_label")]
    public string? SubmitLabel { get; set; }

    [Nullable]
    [JsonPropertyName("success_message")]
    public string? SuccessMessage { get; set; }

    [Nullable]
    [JsonPropertyName("published_at")]
    public DateTime? PublishedAt { get; set; }

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
