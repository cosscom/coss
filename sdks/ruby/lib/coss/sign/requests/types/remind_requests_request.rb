# frozen_string_literal: true

module Coss
  module Sign
    module Requests
      module Types
        class RemindRequestsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
