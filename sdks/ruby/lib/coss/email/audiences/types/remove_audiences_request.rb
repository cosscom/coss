# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class RemoveAudiencesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
