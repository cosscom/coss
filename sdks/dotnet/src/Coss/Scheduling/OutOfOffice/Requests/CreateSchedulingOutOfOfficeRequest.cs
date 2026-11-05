using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Scheduling;

[Serializable]
public record CreateSchedulingOutOfOfficeRequest
{
    /// <summary>
    /// One host, by id or uid.
    /// </summary>
    [Optional]
    [JsonPropertyName("host")]
    public string? Host { get; set; }

    /// <summary>
    /// Several hosts, by id or uid. Each gets an entry of their own.
    /// </summary>
    [Optional]
    [JsonPropertyName("hosts")]
    public IEnumerable<string>? Hosts { get; set; }

    /// <summary>
    /// Every active host matching these attributes right now. A host added later isn't covered.
    /// </summary>
    [Optional]
    [JsonPropertyName("host_filter")]
    public Dictionary<string, OneOf<string, IEnumerable<string>>>? HostFilter { get; set; }

    /// <summary>
    /// An ISO 8601 instant with an offset.
    /// </summary>
    [Optional]
    [JsonPropertyName("start")]
    public string? Start { get; set; }

    /// <summary>
    /// An ISO 8601 instant with an offset.
    /// </summary>
    [Optional]
    [JsonPropertyName("end")]
    public string? End { get; set; }

    /// <summary>
    /// The first whole day away. Use instead of `start` and `end`.
    /// </summary>
    [Optional]
    [JsonPropertyName("start_date")]
    public string? StartDate { get; set; }

    /// <summary>
    /// The last whole day away, which is included.
    /// </summary>
    [Optional]
    [JsonPropertyName("end_date")]
    public string? EndDate { get; set; }

    /// <summary>
    /// What the dates mean in. Default: the host's zone when this is made.
    /// </summary>
    [Optional]
    [JsonPropertyName("time_zone")]
    public string? TimeZone { get; set; }

    /// <summary>
    /// Who can be booked in this host's place during it, by id or uid, in the order to try them. They still have to fit how a booking's routed.
    /// </summary>
    [Optional]
    [JsonPropertyName("delegates")]
    public IEnumerable<string>? Delegates { get; set; }

    /// <summary>
    /// One of `unspecified`, `vacation`, `travel`, `sick`, `public_holiday`, `parental_leave`, `training` and `other`, or a key from the settings' `out_of_office_reasons`. Only people who manage this host see it: never bookers, webhooks or calendars.
    /// </summary>
    [Optional]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    /// <summary>
    /// For people who manage this host. Encrypted, and never shown to a booker.
    /// </summary>
    [Optional]
    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    /// <summary>
    /// Shown to bookers while this host is away. Can't contain a link.
    /// </summary>
    [Optional]
    [JsonPropertyName("public_message")]
    public string? PublicMessage { get; set; }

    /// <summary>
    /// Put a private "Out of office" event on the host's calendar. Default: true.
    /// </summary>
    [Optional]
    [JsonPropertyName("show_on_calendar")]
    public bool? ShowOnCalendar { get; set; }

    /// <summary>
    /// What happens to bookings already in the way. `leave` (the default) only reports them. `reassign` moves them, and any nobody can take stay where they are.
    /// </summary>
    [Optional]
    [JsonPropertyName("existing_bookings")]
    public CreateSchedulingOutOfOfficeRequestExistingBookings? ExistingBookings { get; set; }

    /// <summary>
    /// With `existing_bookings: reassign`: who they go to. Default: the fairest who's free.
    /// </summary>
    [Optional]
    [JsonPropertyName("reassign")]
    public CreateSchedulingOutOfOfficeRequestReassign? Reassign { get; set; }

    /// <summary>
    /// Your own id for this entry, unique in the environment. Needs one host.
    /// </summary>
    [Optional]
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
