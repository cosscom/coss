using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Content to classify with the event. Its scores go in `signals.content` and rules can test them; `content.*` reasons fire only at thresholds you set.
/// </summary>
[Serializable]
public record CreateRiskAssessmentRequestContent : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Text the user wrote (a profile bio, a message, a listing). Classified by an AI model with zero data retention and never stored: only its scores are.
    /// </summary>
    [JsonPropertyName("text")]
    public required string Text { get; set; }

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
