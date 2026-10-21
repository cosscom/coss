# frozen_string_literal: true

module Coss
  module LogDrains
    module Types
      class GetLogDrainsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
