using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// The browser the event came from: recognizes it across accounts (`duplicate.device`, device velocity, fraud memory) and spots automation.
/// </summary>
[Serializable]
public record CreateRiskAssessmentRequestDevice : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// What `collectDevice()` from `coss/device` returned in the user's browser, passed through your server.
    /// </summary>
    [JsonPropertyName("token")]
    public required string Token { get; set; }

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
