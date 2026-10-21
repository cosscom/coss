using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Overrides the environment's tracking settings (its default, or the rule for this email's category) for this email. Omitted fields keep the configured setting.
/// </summary>
[Serializable]
public record TrackingOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Add an invisible pixel to the HTML body and record `email.opened` events.
    /// </summary>
    [Optional]
    [JsonPropertyName("opens")]
    public bool? Opens { get; set; }

    /// <summary>
    /// Send HTML links through a coss.com redirect and record `email.clicked` events. Links with a `data-coss-no-track` attribute are left alone.
    /// </summary>
    [Optional]
    [JsonPropertyName("clicks")]
    public bool? Clicks { get; set; }

    /// <summary>
    /// Add one-click unsubscribe headers (`List-Unsubscribe` and `List-Unsubscribe-Post`, RFC 8058). An unsubscribe suppresses the recipient for this email's category and records `email.unsubscribed`. Needs a `category`, a single recipient, no `List-Unsubscribe` header of your own and at most 13 custom headers.
    /// </summary>
    [Optional]
    [JsonPropertyName("unsubscribe")]
    public bool? Unsubscribe { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
