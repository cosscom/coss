# frozen_string_literal: true

module Coss
  module WebhookListeners
    module Types
      class PollWebhookListenerRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :acks, -> { Internal::Types::Array[Coss::Types::WebhookListenerAck] }, optional: true, nullable: false

        field :wait_ms, -> { Integer }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false
      end
    end
  end
end
