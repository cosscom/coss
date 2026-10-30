using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record FormContacts : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    [JsonPropertyName("audience_ids")]
    public IEnumerable<string> AudienceIds { get; set; } = new List<string>();

    [JsonPropertyName("topics")]
    public IEnumerable<string> Topics { get; set; } = new List<string>();

    [Nullable]
    [JsonPropertyName("double_opt_in")]
    public bool? DoubleOptIn { get; set; }

    [Nullable]
    [JsonPropertyName("first_name_field")]
    public string? FirstNameField { get; set; }

    [Nullable]
    [JsonPropertyName("last_name_field")]
    public string? LastNameField { get; set; }

    [JsonPropertyName("properties")]
    public Dictionary<string, string> Properties { get; set; } = new Dictionary<string, string>();

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
