# frozen_string_literal: true

module Coss
  module Types
    class WebhookEndpoint < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookEndpointObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: true

      field :event_types, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :disabled_reason, -> { Coss::Types::WebhookEndpointDisabledReason }, optional: false, nullable: true

      field :disabled_at, -> { String }, optional: false, nullable: true

      field :failing_since, -> { String }, optional: false, nullable: true

      field :previous_secret_expires_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
