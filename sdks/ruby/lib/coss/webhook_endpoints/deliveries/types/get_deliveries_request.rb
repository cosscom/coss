# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Deliveries
      module Types
        class GetDeliveriesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :delivery_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
