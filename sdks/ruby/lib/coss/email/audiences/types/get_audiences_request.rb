# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class GetAudiencesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
