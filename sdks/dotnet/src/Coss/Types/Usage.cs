using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record Usage : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required UsageObject Object { get; set; }

    /// <summary>
    /// What is counted, e.g. `email.recipients`.
    /// </summary>
    [JsonPropertyName("meter")]
    public required UsageMeter Meter { get; set; }

    /// <summary>
    /// e.g. `country=US` for SMS; `null` for none.
    /// </summary>
    [JsonPropertyName("dimension")]
    public string? Dimension { get; set; }

    /// <summary>
    /// Set with `group_by=environment`.
    /// </summary>
    [JsonPropertyName("environment_id")]
    public string? EnvironmentId { get; set; }

    [JsonPropertyName("start")]
    public required DateTime Start { get; set; }

    [JsonPropertyName("end")]
    public required DateTime End { get; set; }

    [JsonPropertyName("quantity")]
    public required long Quantity { get; set; }

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
