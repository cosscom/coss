using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record ForgetUsersRequest
{
    /// <summary>
    /// Your id for the user.
    /// </summary>
    [JsonIgnore]
    public required string UserId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
