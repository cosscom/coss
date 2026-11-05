using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Scheduling;

[Serializable]
public record UpdateBookingLocationRequest
{
    /// <summary>
    /// The booking's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [Nullable]
    [JsonPropertyName("location")]
    public OneOf<
        SchedulingLocationZero,
        SchedulingLocationNumber,
        SchedulingLocationAddress,
        SchedulingLocationThree,
        SchedulingLocationFour,
        SchedulingLocationFive
    >? Location { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
