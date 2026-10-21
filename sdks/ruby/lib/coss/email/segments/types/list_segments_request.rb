# frozen_string_literal: true

module Coss
  module Email
    module Segments
      module Types
        class ListSegmentsRequest < Internal::Types::Model
          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
