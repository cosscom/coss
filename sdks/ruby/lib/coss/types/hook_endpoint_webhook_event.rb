# frozen_string_literal: true

module Coss
  module Types
    class HookEndpointWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::HookEndpointWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::HookEndpointWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::HookEndpointWebhookEventData }, optional: false, nullable: false
    end
  end
end
