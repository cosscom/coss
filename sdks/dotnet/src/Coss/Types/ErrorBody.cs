using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record ErrorBody : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("type")]
    public required ErrorBodyType Type { get; set; }

    /// <summary>
    /// Machine-readable reason, e.g. `invalid_api_key`.
    /// </summary>
    [JsonPropertyName("code")]
    public required string Code { get; set; }

    /// <summary>
    /// Human-readable explanation. May change.
    /// </summary>
    [JsonPropertyName("message")]
    public required string Message { get; set; }

    /// <summary>
    /// The request field or header the error relates to.
    /// </summary>
    [Optional]
    [JsonPropertyName("param")]
    public string? Param { get; set; }

    /// <summary>
    /// Every problem: of the request (`validation_error`) or of a template (`invalid_template_variables`, `template_invalid`).
    /// </summary>
    [Optional]
    [JsonPropertyName("issues")]
    public IEnumerable<ErrorBodyIssuesItem>? Issues { get; set; }

    [JsonPropertyName("request_id")]
    public required string RequestId { get; set; }

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
