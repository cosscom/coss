using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record FormSpam : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("honeypot_field")]
    public required string HoneypotField { get; set; }

    [JsonPropertyName("captcha")]
    public required FormSpamCaptcha Captcha { get; set; }

    [Nullable]
    [JsonPropertyName("captcha_site_key")]
    public string? CaptchaSiteKey { get; set; }

    [Nullable]
    [JsonPropertyName("content_threshold")]
    public double? ContentThreshold { get; set; }

    [JsonPropertyName("on_review")]
    public required FormSpamOnReview OnReview { get; set; }

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
