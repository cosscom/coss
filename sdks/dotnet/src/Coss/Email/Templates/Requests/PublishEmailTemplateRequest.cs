using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record PublishEmailTemplateRequest
{
    /// <summary>
    /// The template's id or alias.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The draft `revision` you read. When given, the request is refused (`template_revision_mismatch`) if the draft changed since.
    /// </summary>
    [JsonPropertyName("revision")]
    public long? Revision { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
