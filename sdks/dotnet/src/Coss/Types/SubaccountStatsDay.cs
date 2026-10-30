using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SubaccountStatsDay : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("date")]
    public required DateOnly Date { get; set; }

    /// <summary>
    /// Recipients of the emails sent that day.
    /// </summary>
    [JsonPropertyName("recipients")]
    public required long Recipients { get; set; }

    /// <summary>
    /// Handed to the provider (delivered or not).
    /// </summary>
    [JsonPropertyName("sent")]
    public required long Sent { get; set; }

    [JsonPropertyName("delivered")]
    public required long Delivered { get; set; }

    [JsonPropertyName("bounced")]
    public required long Bounced { get; set; }

    [JsonPropertyName("complained")]
    public required long Complained { get; set; }

    [JsonPropertyName("failed")]
    public required long Failed { get; set; }

    /// <summary>
    /// Skipped: on a suppression list.
    /// </summary>
    [JsonPropertyName("suppressed")]
    public required long Suppressed { get; set; }

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
