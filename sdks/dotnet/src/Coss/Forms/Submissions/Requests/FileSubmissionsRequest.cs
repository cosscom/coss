using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Forms;

[Serializable]
public record FileSubmissionsRequest
{
    /// <summary>
    /// The form's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The submission's id.
    /// </summary>
    [JsonIgnore]
    public required string SubmissionId { get; set; }

    /// <summary>
    /// The file's id (`files[].id` of the submission).
    /// </summary>
    [JsonIgnore]
    public required string FileId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
