using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Email;

[Serializable]
public record ExportSuppressionsRequest
{
    /// <summary>
    /// Only entries with this scope.
    /// </summary>
    [JsonIgnore]
    public OneOf<
        ExportSuppressionsRequestScopeZero,
        ExportSuppressionsRequestScopeOne,
        string
    >? Scope { get; set; }

    /// <summary>
    /// Only entries with this reason.
    /// </summary>
    [JsonIgnore]
    public ExportSuppressionsRequestReason? Reason { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
