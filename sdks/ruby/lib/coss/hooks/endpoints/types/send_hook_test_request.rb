# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      module Types
        class SendHookTestRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :endpoint_id, -> { String }, optional: false, nullable: false

          field :event_type, -> { String }, optional: false, nullable: false

          field :payload, -> { Internal::Types::Hash[String, Object] }, optional: true, nullable: false
        end
      end
    end
  end
end
