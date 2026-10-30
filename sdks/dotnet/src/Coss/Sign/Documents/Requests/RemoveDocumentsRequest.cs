using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record RemoveDocumentsRequest
{
    /// <summary>
    /// The document's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
