using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record TemplateContentInput : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// A BCP 47 language tag, e.g. "en" or "pt-BR".
    /// </summary>
    [JsonPropertyName("locale")]
    public required string Locale { get; set; }

    /// <summary>
    /// The subject template.
    /// </summary>
    [JsonPropertyName("subject")]
    public required string Subject { get; set; }

    /// <summary>
    /// The HTML template. Provide `html`, `text`, or both.
    /// </summary>
    [JsonPropertyName("html")]
    public string? Html { get; set; }

    /// <summary>
    /// The plain-text template.
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

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
