using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateEmailTemplateDraftRequest
{
    /// <summary>
    /// The template's id or alias.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The draft `revision` you read. When given, the request is refused (`template_revision_mismatch`) if the draft changed since.
    /// </summary>
    [Optional]
    [JsonPropertyName("revision")]
    public long? Revision { get; set; }

    /// <summary>
    /// The locale sends fall back to when they ask for none, or for one without content. Defaults to the first entry of `contents` (or "en").
    /// </summary>
    [Optional]
    [JsonPropertyName("default_locale")]
    public string? DefaultLocale { get; set; }

    /// <summary>
    /// The variables the template uses, with their types.
    /// </summary>
    [Optional]
    [JsonPropertyName("variables")]
    public IEnumerable<TemplateVariableInput>? Variables { get; set; }

    /// <summary>
    /// Example values for previews and test sends in the dashboard.
    /// </summary>
    [Optional]
    [JsonPropertyName("sample_variables")]
    public Dictionary<string, object?>? SampleVariables { get; set; }

    /// <summary>
    /// The subject, HTML and text per locale.
    /// </summary>
    [Optional]
    [JsonPropertyName("contents")]
    public IEnumerable<TemplateContentInput>? Contents { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
