# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Types
      class CreateWebhookEndpointRequest < Internal::Types::Model
        field :url, -> { String }, optional: false, nullable: false

        field :description, -> { String }, optional: true, nullable: false

        field :event_types, -> { Internal::Types::Array[Coss::WebhookEndpoints::Types::CreateWebhookEndpointRequestEventTypesItem] }, optional: true, nullable: false

        field :api_version, -> { Coss::WebhookEndpoints::Types::CreateWebhookEndpointRequestAPIVersion }, optional: true, nullable: false
      end
    end
  end
end
