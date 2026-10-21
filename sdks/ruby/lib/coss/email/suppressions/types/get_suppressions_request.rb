# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class GetSuppressionsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
