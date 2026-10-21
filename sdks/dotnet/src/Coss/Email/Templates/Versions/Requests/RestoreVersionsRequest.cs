using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email.Templates;

[Serializable]
public record RestoreVersionsRequest
{
    /// <summary>
    /// The template's id or alias.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// A published version number.
    /// </summary>
    [JsonIgnore]
    public required long Version { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
