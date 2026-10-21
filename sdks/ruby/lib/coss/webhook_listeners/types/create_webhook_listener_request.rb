# frozen_string_literal: true

module Coss
  module WebhookListeners
    module Types
      class CreateWebhookListenerRequest < Internal::Types::Model
        field :event_types, -> { Internal::Types::Array[Coss::WebhookListeners::Types::CreateWebhookListenerRequestEventTypesItem] }, optional: true, nullable: false

        field :api_version, -> { Coss::WebhookListeners::Types::CreateWebhookListenerRequestAPIVersion }, optional: true, nullable: false

        field :description, -> { String }, optional: true, nullable: false
      end
    end
  end
end
