# frozen_string_literal: true

module Coss
  module Email
    module Topics
      module Types
        class GetTopicsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
