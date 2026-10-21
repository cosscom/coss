using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record RenderEmailTemplateRequest
{
    /// <summary>
    /// The template's id or alias.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// A published version to render. Default: the draft.
    /// </summary>
    [Optional]
    [JsonPropertyName("version")]
    public long? Version { get; set; }

    /// <summary>
    /// The locale to render, e.g. "pt-BR". Falls back to the language ("pt"), then to the default locale, as sends do.
    /// </summary>
    [Optional]
    [JsonPropertyName("locale")]
    public string? Locale { get; set; }

    /// <summary>
    /// Values by variable name, checked as a send checks them. Default: `sample_variables`.
    /// </summary>
    [Optional]
    [JsonPropertyName("variables")]
    public Dictionary<string, object?>? Variables { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
