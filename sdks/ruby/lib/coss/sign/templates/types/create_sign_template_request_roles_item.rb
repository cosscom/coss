# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignTemplateRequestRolesItem < Internal::Types::Model
          field :key, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
