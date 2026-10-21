# frozen_string_literal: true

module Coss
  module Types
    class Log < Internal::Types::Model
      field :object, -> { Coss::Types::LogObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :source, -> { Coss::Types::LogSource }, optional: false, nullable: false

      field :level, -> { Coss::Types::LogLevel }, optional: false, nullable: false

      field :type, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false

      field :request_id, -> { String }, optional: false, nullable: true

      field :api_key_id, -> { String }, optional: false, nullable: true

      field :method_, -> { String }, optional: false, nullable: true, api_name: "method"

      field :path, -> { String }, optional: false, nullable: true

      field :route, -> { String }, optional: false, nullable: true

      field :status_code, -> { Integer }, optional: false, nullable: true

      field :duration_ms, -> { Integer }, optional: false, nullable: true

      field :client_ip, -> { String }, optional: false, nullable: true

      field :user_agent, -> { String }, optional: false, nullable: true

      field :error_code, -> { String }, optional: false, nullable: true

      field :resource_type, -> { String }, optional: false, nullable: true

      field :resource_id, -> { String }, optional: false, nullable: true

      field :recipient, -> { String }, optional: false, nullable: true

      field :attributes, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: false
    end
  end
end
