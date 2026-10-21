# frozen_string_literal: true

module Coss
  module Hooks
    module Messages
      module Types
        class SendHookMessageRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :event_type, -> { String }, optional: false, nullable: false

          field :payload, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: false
        end
      end
    end
  end
end
