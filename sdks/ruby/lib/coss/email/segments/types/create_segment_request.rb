# frozen_string_literal: true

module Coss
  module Email
    module Segments
      module Types
        class CreateSegmentRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :filter, -> { Coss::Types::SegmentFilter }, optional: false, nullable: false
        end
      end
    end
  end
end
