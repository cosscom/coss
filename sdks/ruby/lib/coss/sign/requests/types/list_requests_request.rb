# frozen_string_literal: true

module Coss
  module Sign
    module Requests
      module Types
        class ListRequestsRequest < Internal::Types::Model
          field :status, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
