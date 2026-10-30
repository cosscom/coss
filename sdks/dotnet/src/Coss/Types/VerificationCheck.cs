using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record VerificationCheck : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required VerificationCheckObject Object { get; set; }

    /// <summary>
    /// Whether the code is right. Only `true` proves the end user has the phone or mailbox; checking an approved verification again with its code stays `true` until it expires.
    /// </summary>
    [JsonPropertyName("valid")]
    public required bool Valid { get; set; }

    [JsonPropertyName("verification")]
    public required Verification Verification { get; set; }

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
