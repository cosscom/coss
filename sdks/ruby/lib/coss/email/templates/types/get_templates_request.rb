# frozen_string_literal: true

module Coss
  module Email
    module Templates
      module Types
        class GetTemplatesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
