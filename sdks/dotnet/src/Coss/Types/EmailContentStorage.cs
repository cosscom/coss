using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Whether coss.com keeps the email's content after sending it.
/// </summary>
[Serializable]
public record EmailContentStorage : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// The environment's content storage when the email was sent. With `discard`, the subject, `html`, `text`, `headers`, template variables and attachment filenames are cleared once the email is sent, fails or is canceled.
    /// </summary>
    [JsonPropertyName("mode")]
    public required EmailContentStorageMode Mode { get; set; }

    /// <summary>
    /// When the content was cleared; `null` while it is kept. A cleared email has an empty `subject`, `html` and `text` `null` and no `headers`.
    /// </summary>
    [Nullable]
    [JsonPropertyName("discarded_at")]
    public DateTime? DiscardedAt { get; set; }

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
