using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SmsEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Why the message failed or wasn't delivered.
    /// </summary>
    [JsonPropertyName("failure")]
    public SmsEventDataFailure? Failure { get; set; }

    /// <summary>
    /// The provider's or carrier's own error code, e.g. `30007`.
    /// </summary>
    [JsonPropertyName("provider_error_code")]
    public string? ProviderErrorCode { get; set; }

    /// <summary>
    /// `sms.suppressed`: the entry that made coss.com skip the number.
    /// </summary>
    [JsonPropertyName("suppression")]
    public SmsEventDataSuppression? Suppression { get; set; }

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
