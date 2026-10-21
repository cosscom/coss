# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Types
      class UpdateWebhookEndpointRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :url, -> { String }, optional: true, nullable: false

        field :description, -> { String }, optional: true, nullable: false

        field :event_types, -> { Internal::Types::Array[Coss::WebhookEndpoints::Types::UpdateWebhookEndpointRequestEventTypesItem] }, optional: true, nullable: false

        field :api_version, -> { Coss::WebhookEndpoints::Types::UpdateWebhookEndpointRequestAPIVersion }, optional: true, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false
      end
    end
  end
end
