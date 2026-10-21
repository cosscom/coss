using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// What coss.com keeps of the API key's environment's emails. Emails keep the setting that applied when they were sent.
/// </summary>
[Serializable]
public record StorageSettings : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required StorageSettingsObject Object { get; set; }

    /// <summary>
    /// `store` (the default) keeps each email's content (subject, body, headers, template variables, attachment filenames) for the email retention period. `discard` keeps it only until the email is sent, fails or is canceled; its metadata (addresses, tags, category, status, recipients, events) is kept as usual.
    /// </summary>
    [JsonPropertyName("content_storage")]
    public required StorageSettingsContentStorage ContentStorage { get; set; }

    /// <summary>
    /// When the setting last changed; `null` if it never did (content is stored).
    /// </summary>
    [JsonPropertyName("updated_at")]
    public DateTime? UpdatedAt { get; set; }

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
