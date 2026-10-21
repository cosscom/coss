# frozen_string_literal: true

module Coss
  module Types
    class HookEndpointWithSecret < Internal::Types::Model
      field :object, -> { Coss::Types::HookEndpointWithSecretObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :application_id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :filter_types, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :rate_limit_per_second, -> { Integer }, optional: false, nullable: true

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :disabled_reason, -> { Coss::Types::HookEndpointWithSecretDisabledReason }, optional: false, nullable: true

      field :disabled_at, -> { String }, optional: false, nullable: true

      field :failing_since, -> { String }, optional: false, nullable: true

      field :previous_secret_expires_at, -> { String }, optional: false, nullable: true

      field :metadata, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false

      field :secret, -> { String }, optional: false, nullable: false
    end
  end
end
