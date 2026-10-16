# frozen_string_literal: true

require "date"

module Coss
  module Rails
    # coss.com's own fields for one message (`category`, `tags`, `scheduled_at`, `tracking`, the
    # idempotency key), validated and turned into what the API takes.
    module Options
      KEYS = %i[category tags scheduled_at tracking idempotency_key].freeze

      module_function

      # Validates `options` (a Hash with `KEYS`) and returns them ready for the request body:
      # `tags` as `[{ "name" => …, "value" => … }]`, `scheduled_at` as a UTC
      # `YYYY-MM-DDTHH:MM:SSZ` string (a String is kept as given), `tracking` with string keys.
      # `nil` values are left out. Raises ArgumentError for anything else.
      def normalize(options)
        raise ArgumentError, "coss.com options must be a Hash, got #{options.class}" unless options.is_a?(Hash)

        unknown = options.keys.map(&:to_sym) - KEYS
        unless unknown.empty?
          raise ArgumentError, "unknown coss.com option(s): #{unknown.join(', ')} (known: #{KEYS.join(', ')})"
        end

        options.each_with_object({}) do |(key, value), normalized|
          next if value.nil?

          key = key.to_sym
          normalized[key] = send(:"normalize_#{key}", value)
        end
      end

      def normalize_category(value)
        string(value, "category")
      end

      def normalize_idempotency_key(value)
        string(value, "idempotency_key")
      end

      def normalize_tags(value)
        case value
        when Hash
          value.map { |name, tag_value| tag(name, tag_value) }
        when Array
          value.map do |entry|
            unless entry.is_a?(Hash)
              raise ArgumentError, "coss.com tags must be a Hash or an Array of { name:, value: } Hashes"
            end

            tag(entry[:name] || entry["name"], entry[:value] || entry["value"])
          end
        else
          raise ArgumentError, "coss.com tags must be a Hash or an Array of { name:, value: } Hashes"
        end
      end

      def normalize_scheduled_at(value)
        case value
        when String
          value
        when DateTime
          value.to_time.utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        when Time
          value.getutc.strftime("%Y-%m-%dT%H:%M:%SZ")
        else
          # ActiveSupport::TimeWithZone is_a?(Time) already; this covers other time-likes.
          return value.utc.strftime("%Y-%m-%dT%H:%M:%SZ") if value.respond_to?(:utc) && !value.is_a?(Date)

          raise ArgumentError,
                "coss.com scheduled_at must be a Time, DateTime, ActiveSupport::TimeWithZone or String, " \
                "got #{value.class}"
        end
      end

      def normalize_tracking(value)
        unless value.is_a?(Hash)
          raise ArgumentError,
                "coss.com tracking must be a Hash like { opens: true, clicks: false }"
        end

        value.to_h { |key, setting| [key.to_s, setting] }
      end

      def tag(name, value)
        raise ArgumentError, "a coss.com tag needs a name and a value" if name.nil? || value.nil?

        { "name" => name.to_s, "value" => value.to_s }
      end

      def string(value, field)
        return value if value.is_a?(String)
        return value.to_s if value.is_a?(Symbol)

        raise ArgumentError, "coss.com #{field} must be a String, got #{value.class}"
      end

      private_class_method :normalize_category, :normalize_idempotency_key, :normalize_tags,
                           :normalize_scheduled_at, :normalize_tracking, :tag, :string
    end
  end
end
