# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Deliveries
      module Types
        class ListDeliveriesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :status, -> { Coss::WebhookEndpoints::Deliveries::Types::ListDeliveriesRequestStatus }, optional: true, nullable: false

          field :event_id, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
