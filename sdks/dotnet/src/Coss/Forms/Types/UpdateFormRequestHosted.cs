using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UpdateFormRequestHosted : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Serve the form as a page at its `hosted_url` (needs `fields`). Default false.
    /// </summary>
    [Optional]
    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("title")]
    public Optional<string?> Title { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("description")]
    public Optional<string?> Description { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("submit_label")]
    public Optional<string?> SubmitLabel { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("success_message")]
    public Optional<string?> SuccessMessage { get; set; }

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
