using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sms_;

[Serializable]
public record CheckSuppressionsRequest
{
    [JsonIgnore]
    public required string PhoneNumber { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
