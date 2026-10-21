# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      module Types
        class ListDeliveriesEndpointsRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :endpoint_id, -> { String }, optional: false, nullable: false

          field :status, -> { Coss::Hooks::Endpoints::Types::ListDeliveriesEndpointsRequestStatus }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
