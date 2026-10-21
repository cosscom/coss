# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      module Types
        class GetEndpointsRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :endpoint_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
