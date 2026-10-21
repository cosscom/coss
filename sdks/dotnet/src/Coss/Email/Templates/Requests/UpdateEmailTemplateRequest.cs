using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateEmailTemplateRequest
{
    /// <summary>
    /// The template's id or alias.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// `null` removes the alias.
    /// </summary>
    [JsonPropertyName("alias")]
    public string? Alias { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
