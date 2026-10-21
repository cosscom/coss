using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record UpdateStorageSettingsRequest
{
    /// <summary>
    /// `store` keeps emails' content; `discard` clears it once they are sent.
    /// </summary>
    [JsonPropertyName("content_storage")]
    public required UpdateStorageSettingsRequestContentStorage ContentStorage { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
