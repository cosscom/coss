using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateFormRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// `false`: submissions are refused.
    /// </summary>
    [Optional]
    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    /// <summary>
    /// The form's fields. `null` (default): any field is accepted. With fields, submissions are validated against them.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("fields")]
    public Optional<IEnumerable<FormFieldInput>?> Fields { get; set; }

    /// <summary>
    /// With `fields`: refuse fields the form doesn't define. Default false.
    /// </summary>
    [Optional]
    [JsonPropertyName("strict_fields")]
    public bool? StrictFields { get; set; }

    /// <summary>
    /// Sites that may post to the form, like `https://www.example.com` (sandbox environments also `http://localhost:&lt;port&gt;`). Empty (default): any.
    /// </summary>
    [Optional]
    [JsonPropertyName("allowed_origins")]
    public IEnumerable<string>? AllowedOrigins { get; set; }

    /// <summary>
    /// Where browsers go after an HTML post. `null`: coss.com's thank-you page. A post's `_next` field overrides it when its origin is allowed.
    /// </summary>
    [Nullable, Optional]
    [JsonPropertyName("redirect_url")]
    public Optional<string?> RedirectUrl { get; set; }

    [Optional]
    [JsonPropertyName("spam")]
    public CreateFormRequestSpam? Spam { get; set; }

    [Optional]
    [JsonPropertyName("submitter")]
    public CreateFormRequestSubmitter? Submitter { get; set; }

    [Optional]
    [JsonPropertyName("notifications")]
    public CreateFormRequestNotifications? Notifications { get; set; }

    [Optional]
    [JsonPropertyName("contacts")]
    public CreateFormRequestContacts? Contacts { get; set; }

    [Optional]
    [JsonPropertyName("files")]
    public CreateFormRequestFiles? Files { get; set; }

    [Optional]
    [JsonPropertyName("hosted")]
    public CreateFormRequestHosted? Hosted { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
