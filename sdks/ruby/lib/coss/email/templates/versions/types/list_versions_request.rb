# frozen_string_literal: true

module Coss
  module Email
    module Templates
      module Versions
        module Types
          class ListVersionsRequest < Internal::Types::Model
            field :id, -> { String }, optional: false, nullable: false

            field :limit, -> { Integer }, optional: true, nullable: false

            field :after, -> { Integer }, optional: true, nullable: false
          end
        end
      end
    end
  end
end
