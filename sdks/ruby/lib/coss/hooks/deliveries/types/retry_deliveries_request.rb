# frozen_string_literal: true

module Coss
  module Hooks
    module Deliveries
      module Types
        class RetryDeliveriesRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :delivery_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
