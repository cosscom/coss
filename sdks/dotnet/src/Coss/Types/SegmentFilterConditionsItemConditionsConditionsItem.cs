// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SegmentFilterConditionsItemConditionsConditionsItem.JsonConverter))]
[Serializable]
public record SegmentFilterConditionsItemConditionsConditionsItem
{
    internal SegmentFilterConditionsItemConditionsConditionsItem(string type, object? value)
    {
        Field = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of SegmentFilterConditionsItemConditionsConditionsItem with <see cref="SegmentFilterConditionsItemConditionsConditionsItem.Property"/>.
    /// </summary>
    public SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Property value
    )
    {
        Field = "property";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of SegmentFilterConditionsItemConditionsConditionsItem with <see cref="SegmentFilterConditionsItemConditionsConditionsItem.Email"/>.
    /// </summary>
    public SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Email value
    )
    {
        Field = "email";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of SegmentFilterConditionsItemConditionsConditionsItem with <see cref="SegmentFilterConditionsItemConditionsConditionsItem.Audience"/>.
    /// </summary>
    public SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Audience value
    )
    {
        Field = "audience";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of SegmentFilterConditionsItemConditionsConditionsItem with <see cref="SegmentFilterConditionsItemConditionsConditionsItem.Topic"/>.
    /// </summary>
    public SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Topic value
    )
    {
        Field = "topic";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of SegmentFilterConditionsItemConditionsConditionsItem with <see cref="SegmentFilterConditionsItemConditionsConditionsItem.CreatedAt"/>.
    /// </summary>
    public SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.CreatedAt value
    )
    {
        Field = "created_at";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("field")]
    public string Field { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Field"/> is "property"
    /// </summary>
    public bool IsProperty => Field == "property";

    /// <summary>
    /// Returns true if <see cref="Field"/> is "email"
    /// </summary>
    public bool IsEmail => Field == "email";

    /// <summary>
    /// Returns true if <see cref="Field"/> is "audience"
    /// </summary>
    public bool IsAudience => Field == "audience";

    /// <summary>
    /// Returns true if <see cref="Field"/> is "topic"
    /// </summary>
    public bool IsTopic => Field == "topic";

    /// <summary>
    /// Returns true if <see cref="Field"/> is "created_at"
    /// </summary>
    public bool IsCreatedAt => Field == "created_at";

    /// <summary>
    /// Returns the value as a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty"/> if <see cref="Field"/> is 'property', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Field"/> is not 'property'.</exception>
    public Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty AsProperty() =>
        IsProperty
            ? (Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty)Value!
            : throw new global::System.Exception(
                "SegmentFilterConditionsItemConditionsConditionsItem.Field is not 'property'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail"/> if <see cref="Field"/> is 'email', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Field"/> is not 'email'.</exception>
    public Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail AsEmail() =>
        IsEmail
            ? (Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail)Value!
            : throw new global::System.Exception(
                "SegmentFilterConditionsItemConditionsConditionsItem.Field is not 'email'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience"/> if <see cref="Field"/> is 'audience', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Field"/> is not 'audience'.</exception>
    public Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience AsAudience() =>
        IsAudience
            ? (Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience)Value!
            : throw new global::System.Exception(
                "SegmentFilterConditionsItemConditionsConditionsItem.Field is not 'audience'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic"/> if <see cref="Field"/> is 'topic', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Field"/> is not 'topic'.</exception>
    public Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic AsTopic() =>
        IsTopic
            ? (Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic)Value!
            : throw new global::System.Exception(
                "SegmentFilterConditionsItemConditionsConditionsItem.Field is not 'topic'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt"/> if <see cref="Field"/> is 'created_at', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Field"/> is not 'created_at'.</exception>
    public Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt AsCreatedAt() =>
        IsCreatedAt
            ? (Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt)Value!
            : throw new global::System.Exception(
                "SegmentFilterConditionsItemConditionsConditionsItem.Field is not 'created_at'"
            );

    public T Match<T>(
        Func<Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty, T> onProperty,
        Func<Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail, T> onEmail,
        Func<Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience, T> onAudience,
        Func<Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic, T> onTopic,
        Func<Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt, T> onCreatedAt,
        Func<string, object?, T> onUnknown_
    )
    {
        return Field switch
        {
            "property" => onProperty(AsProperty()),
            "email" => onEmail(AsEmail()),
            "audience" => onAudience(AsAudience()),
            "topic" => onTopic(AsTopic()),
            "created_at" => onCreatedAt(AsCreatedAt()),
            _ => onUnknown_(Field, Value),
        };
    }

    public void Visit(
        Action<Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty> onProperty,
        Action<Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail> onEmail,
        Action<Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience> onAudience,
        Action<Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic> onTopic,
        Action<Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt> onCreatedAt,
        Action<string, object?> onUnknown_
    )
    {
        switch (Field)
        {
            case "property":
                onProperty(AsProperty());
                break;
            case "email":
                onEmail(AsEmail());
                break;
            case "audience":
                onAudience(AsAudience());
                break;
            case "topic":
                onTopic(AsTopic());
                break;
            case "created_at":
                onCreatedAt(AsCreatedAt());
                break;
            default:
                onUnknown_(Field, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty"/> and returns true if successful.
    /// </summary>
    public bool TryAsProperty(
        out Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty? value
    )
    {
        if (Field == "property")
        {
            value = (Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail"/> and returns true if successful.
    /// </summary>
    public bool TryAsEmail(out Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail? value)
    {
        if (Field == "email")
        {
            value = (Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience"/> and returns true if successful.
    /// </summary>
    public bool TryAsAudience(
        out Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience? value
    )
    {
        if (Field == "audience")
        {
            value = (Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic"/> and returns true if successful.
    /// </summary>
    public bool TryAsTopic(out Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic? value)
    {
        if (Field == "topic")
        {
            value = (Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt"/> and returns true if successful.
    /// </summary>
    public bool TryAsCreatedAt(
        out Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt? value
    )
    {
        if (Field == "created_at")
        {
            value = (Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Property value
    ) => new(value);

    public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Email value
    ) => new(value);

    public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Audience value
    ) => new(value);

    public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.Topic value
    ) => new(value);

    public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem(
        SegmentFilterConditionsItemConditionsConditionsItem.CreatedAt value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter
        : JsonConverter<SegmentFilterConditionsItemConditionsConditionsItem>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(SegmentFilterConditionsItemConditionsConditionsItem).IsAssignableFrom(
                typeToConvert
            );

        public override SegmentFilterConditionsItemConditionsConditionsItem Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("field", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property 'field'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property 'field' is null");
                }

                throw new JsonException(
                    $"Discriminator property 'field' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property 'field' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("field");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "property" =>
                    jsonWithoutDiscriminator.Deserialize<Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty"
                        ),
                "email" =>
                    jsonWithoutDiscriminator.Deserialize<Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail"
                        ),
                "audience" =>
                    jsonWithoutDiscriminator.Deserialize<Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience"
                        ),
                "topic" =>
                    jsonWithoutDiscriminator.Deserialize<Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic"
                        ),
                "created_at" =>
                    jsonWithoutDiscriminator.Deserialize<Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new SegmentFilterConditionsItemConditionsConditionsItem(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItem value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Field switch
                {
                    "property" => JsonSerializer.SerializeToNode(value.Value, options),
                    "email" => JsonSerializer.SerializeToNode(value.Value, options),
                    "audience" => JsonSerializer.SerializeToNode(value.Value, options),
                    "topic" => JsonSerializer.SerializeToNode(value.Value, options),
                    "created_at" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["field"] = value.Field;
            json.WriteTo(writer, options);
        }

        public override SegmentFilterConditionsItemConditionsConditionsItem ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new SegmentFilterConditionsItemConditionsConditionsItem(
                stringValue,
                stringValue
            );
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItem value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Field);
        }
    }

    /// <summary>
    /// Discriminated union type for property
    /// </summary>
    [Serializable]
    public struct Property
    {
        public Property(Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty value)
        {
            Value = value;
        }

        internal Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem.Property(
            Coss.SegmentFilterConditionsItemConditionsConditionsItemProperty value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for email
    /// </summary>
    [Serializable]
    public struct Email
    {
        public Email(Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail value)
        {
            Value = value;
        }

        internal Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem.Email(
            Coss.SegmentFilterConditionsItemConditionsConditionsItemEmail value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for audience
    /// </summary>
    [Serializable]
    public struct Audience
    {
        public Audience(Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience value)
        {
            Value = value;
        }

        internal Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem.Audience(
            Coss.SegmentFilterConditionsItemConditionsConditionsItemAudience value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for topic
    /// </summary>
    [Serializable]
    public struct Topic
    {
        public Topic(Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic value)
        {
            Value = value;
        }

        internal Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem.Topic(
            Coss.SegmentFilterConditionsItemConditionsConditionsItemTopic value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for created_at
    /// </summary>
    [Serializable]
    public struct CreatedAt
    {
        public CreatedAt(Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt value)
        {
            Value = value;
        }

        internal Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SegmentFilterConditionsItemConditionsConditionsItem.CreatedAt(
            Coss.SegmentFilterConditionsItemConditionsConditionsItemCreatedAt value
        ) => new(value);
    }
}
