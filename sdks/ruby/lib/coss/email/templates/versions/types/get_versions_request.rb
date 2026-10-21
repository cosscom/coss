# frozen_string_literal: true

module Coss
  module Email
    module Templates
      module Versions
        module Types
          class GetVersionsRequest < Internal::Types::Model
            field :id, -> { String }, optional: false, nullable: false

            field :version, -> { Integer }, optional: false, nullable: false
          end
        end
      end
    end
  end
end
