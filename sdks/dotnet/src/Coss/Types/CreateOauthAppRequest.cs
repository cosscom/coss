// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(CreateOauthAppRequest.JsonConverter))]
[Serializable]
public record CreateOauthAppRequest
{
    internal CreateOauthAppRequest(string type, object? value)
    {
        Provider = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of CreateOauthAppRequest with <see cref="CreateOauthAppRequest.Google"/>.
    /// </summary>
    public CreateOauthAppRequest(CreateOauthAppRequest.Google value)
    {
        Provider = "google";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of CreateOauthAppRequest with <see cref="CreateOauthAppRequest.Microsoft"/>.
    /// </summary>
    public CreateOauthAppRequest(CreateOauthAppRequest.Microsoft value)
    {
        Provider = "microsoft";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of CreateOauthAppRequest with <see cref="CreateOauthAppRequest.Zoom"/>.
    /// </summary>
    public CreateOauthAppRequest(CreateOauthAppRequest.Zoom value)
    {
        Provider = "zoom";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("provider")]
    public string Provider { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Provider"/> is "google"
    /// </summary>
    public bool IsGoogle => Provider == "google";

    /// <summary>
    /// Returns true if <see cref="Provider"/> is "microsoft"
    /// </summary>
    public bool IsMicrosoft => Provider == "microsoft";

    /// <summary>
    /// Returns true if <see cref="Provider"/> is "zoom"
    /// </summary>
    public bool IsZoom => Provider == "zoom";

    /// <summary>
    /// Returns the value as a <see cref="Coss.CreateOauthAppRequestGoogle"/> if <see cref="Provider"/> is 'google', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Provider"/> is not 'google'.</exception>
    public Coss.CreateOauthAppRequestGoogle AsGoogle() =>
        IsGoogle
            ? (Coss.CreateOauthAppRequestGoogle)Value!
            : throw new global::System.Exception("CreateOauthAppRequest.Provider is not 'google'");

    /// <summary>
    /// Returns the value as a <see cref="Coss.CreateOauthAppRequestMicrosoft"/> if <see cref="Provider"/> is 'microsoft', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Provider"/> is not 'microsoft'.</exception>
    public Coss.CreateOauthAppRequestMicrosoft AsMicrosoft() =>
        IsMicrosoft
            ? (Coss.CreateOauthAppRequestMicrosoft)Value!
            : throw new global::System.Exception(
                "CreateOauthAppRequest.Provider is not 'microsoft'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Coss.CreateOauthAppRequestZoom"/> if <see cref="Provider"/> is 'zoom', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Provider"/> is not 'zoom'.</exception>
    public Coss.CreateOauthAppRequestZoom AsZoom() =>
        IsZoom
            ? (Coss.CreateOauthAppRequestZoom)Value!
            : throw new global::System.Exception("CreateOauthAppRequest.Provider is not 'zoom'");

    public T Match<T>(
        Func<Coss.CreateOauthAppRequestGoogle, T> onGoogle,
        Func<Coss.CreateOauthAppRequestMicrosoft, T> onMicrosoft,
        Func<Coss.CreateOauthAppRequestZoom, T> onZoom,
        Func<string, object?, T> onUnknown_
    )
    {
        return Provider switch
        {
            "google" => onGoogle(AsGoogle()),
            "microsoft" => onMicrosoft(AsMicrosoft()),
            "zoom" => onZoom(AsZoom()),
            _ => onUnknown_(Provider, Value),
        };
    }

    public void Visit(
        Action<Coss.CreateOauthAppRequestGoogle> onGoogle,
        Action<Coss.CreateOauthAppRequestMicrosoft> onMicrosoft,
        Action<Coss.CreateOauthAppRequestZoom> onZoom,
        Action<string, object?> onUnknown_
    )
    {
        switch (Provider)
        {
            case "google":
                onGoogle(AsGoogle());
                break;
            case "microsoft":
                onMicrosoft(AsMicrosoft());
                break;
            case "zoom":
                onZoom(AsZoom());
                break;
            default:
                onUnknown_(Provider, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.CreateOauthAppRequestGoogle"/> and returns true if successful.
    /// </summary>
    public bool TryAsGoogle(out Coss.CreateOauthAppRequestGoogle? value)
    {
        if (Provider == "google")
        {
            value = (Coss.CreateOauthAppRequestGoogle)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.CreateOauthAppRequestMicrosoft"/> and returns true if successful.
    /// </summary>
    public bool TryAsMicrosoft(out Coss.CreateOauthAppRequestMicrosoft? value)
    {
        if (Provider == "microsoft")
        {
            value = (Coss.CreateOauthAppRequestMicrosoft)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.CreateOauthAppRequestZoom"/> and returns true if successful.
    /// </summary>
    public bool TryAsZoom(out Coss.CreateOauthAppRequestZoom? value)
    {
        if (Provider == "zoom")
        {
            value = (Coss.CreateOauthAppRequestZoom)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator CreateOauthAppRequest(CreateOauthAppRequest.Google value) =>
        new(value);

    public static implicit operator CreateOauthAppRequest(CreateOauthAppRequest.Microsoft value) =>
        new(value);

    public static implicit operator CreateOauthAppRequest(CreateOauthAppRequest.Zoom value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<CreateOauthAppRequest>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(CreateOauthAppRequest).IsAssignableFrom(typeToConvert);

        public override CreateOauthAppRequest Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("provider", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property 'provider'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property 'provider' is null");
                }

                throw new JsonException(
                    $"Discriminator property 'provider' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property 'provider' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("provider");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "google" => jsonWithoutDiscriminator.Deserialize<Coss.CreateOauthAppRequestGoogle?>(
                    options
                )
                    ?? throw new JsonException(
                        "Failed to deserialize Coss.CreateOauthAppRequestGoogle"
                    ),
                "microsoft" =>
                    jsonWithoutDiscriminator.Deserialize<Coss.CreateOauthAppRequestMicrosoft?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Coss.CreateOauthAppRequestMicrosoft"
                        ),
                "zoom" => jsonWithoutDiscriminator.Deserialize<Coss.CreateOauthAppRequestZoom?>(
                    options
                )
                    ?? throw new JsonException(
                        "Failed to deserialize Coss.CreateOauthAppRequestZoom"
                    ),
                _ => json.Deserialize<object?>(options),
            };
            return new CreateOauthAppRequest(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateOauthAppRequest value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Provider switch
                {
                    "google" => JsonSerializer.SerializeToNode(value.Value, options),
                    "microsoft" => JsonSerializer.SerializeToNode(value.Value, options),
                    "zoom" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["provider"] = value.Provider;
            json.WriteTo(writer, options);
        }

        public override CreateOauthAppRequest ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new CreateOauthAppRequest(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateOauthAppRequest value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Provider);
        }
    }

    /// <summary>
    /// Discriminated union type for google
    /// </summary>
    [Serializable]
    public struct Google
    {
        public Google(Coss.CreateOauthAppRequestGoogle value)
        {
            Value = value;
        }

        internal Coss.CreateOauthAppRequestGoogle Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator CreateOauthAppRequest.Google(
            Coss.CreateOauthAppRequestGoogle value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for microsoft
    /// </summary>
    [Serializable]
    public struct Microsoft
    {
        public Microsoft(Coss.CreateOauthAppRequestMicrosoft value)
        {
            Value = value;
        }

        internal Coss.CreateOauthAppRequestMicrosoft Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator CreateOauthAppRequest.Microsoft(
            Coss.CreateOauthAppRequestMicrosoft value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for zoom
    /// </summary>
    [Serializable]
    public struct Zoom
    {
        public Zoom(Coss.CreateOauthAppRequestZoom value)
        {
            Value = value;
        }

        internal Coss.CreateOauthAppRequestZoom Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator CreateOauthAppRequest.Zoom(
            Coss.CreateOauthAppRequestZoom value
        ) => new(value);
    }
}
